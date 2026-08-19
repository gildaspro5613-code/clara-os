"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    label: "OPÉRER",
    items: [
      { name: "Cockpit", href: "/", icon: LayoutDashboard },
      { name: "Missions", href: "/missions", icon: ClipboardList },
      { name: "Conversations", href: "/conversations", icon: MessageCircle },
      { name: "Contacts", href: "/contacts", icon: Users },
    ],
  },
  {
    label: "CONNECTER",
    items: [
      { name: "Téléphonie", href: "/telephonie", icon: Phone },
      { name: "Automatisations", href: "/automatisations", icon: Workflow },
      { name: "Agenda", href: "/agenda", icon: CalendarDays },
    ],
  },
  {
    label: "CONNAÎTRE",
    items: [
      { name: "Documents", href: "/documents", icon: FileText },
      { name: "Journal", href: "/journal", icon: BookOpen },
      { name: "Brain", href: "/brain", icon: Brain },
    ],
  },
  {
    label: "CLARA",
    items: [
      { name: "Clara", href: "/clara", icon: Bot },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

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
                {section.label}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
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
                        {item.name}
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
            Clara connectée
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
