"use client";

import Link from "next/link";
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
  const t = useTranslations("navigation");
  const tc = useTranslations("clara");

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#050505]">
      {/* Logo */}
      <div className="border-b border-white/10 px-8 py-6">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <img
              src="/brand/clara-os-symbol.svg"
              alt=""
              aria-hidden="true"
              className="h-20 w-20 object-contain"
            />

            <h1 className="mt-2 text-xl font-semibold tracking-[0.08em] text-white">
              CLARA OS
            </h1>
          </div>
        </div>

      </div>

      {/* Navigation */}
      <nav className="clara-sidebar-scroll flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-4 text-[10px] font-medium tracking-[0.2em] text-slate-600">
                {section.label === "operate"
                  ? "OPÉRER"
                  : section.label === "connect"
                    ? "CONNECTER"
                    : section.label === "know"
                      ? "CONNAÎTRE"
                      : "CLARA"}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`
                        group
                        relative
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        px-4
                        py-2.5
                        transition-all
                        duration-200
                        ${
                          active
                            ? "bg-white/5 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }
                      `}
                    >
                      {active && (
                        <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-cyan-400" />
                      )}

                      <Icon size={18} strokeWidth={1.8} />

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
      <div className="border-t border-white/10 p-6">
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

          <p>Version 0.2</p>
        </div>
      </div>
    </aside>
  );
}
