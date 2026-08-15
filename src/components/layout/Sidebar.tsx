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
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const tClara = useTranslations("clara");
  const tCommon = useTranslations("common");

  const menu = [
    { name: t("cockpit"), href: "/", icon: LayoutDashboard },
    { name: t("clara"), href: "/clara", icon: Bot },
    { name: t("missions"), href: "/missions", icon: ClipboardList },
    { name: t("conversations"), href: "/conversations", icon: MessageCircle },
    { name: t("contacts"), href: "/contacts", icon: Users },
    { name: t("telephonie"), href: "/telephonie", icon: Phone },
    { name: t("automatisations"), href: "/automatisations", icon: Workflow },
    { name: t("documents"), href: "/documents", icon: FileText },
    { name: t("agenda"), href: "/agenda", icon: CalendarDays },
    { name: t("brain"), href: "/brain", icon: Brain },
  ];

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col overflow-y-auto border-r border-white/10 bg-[#08111F]">

      {/* Logo */}
      <div className="border-b border-white/10 px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {tCommon("appName")}
        </h1>

        <p className="mt-1 text-sm text-slate-400">
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">

        <div className="space-y-1">

          {menu.map((item) => {

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
                  py-3
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
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400" />
                )}

                <Icon size={19} />

                <span className="text-[15px] font-medium">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-6">

        <div className="mb-4 flex items-center gap-2">

          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />

          <span className="text-sm text-slate-300">
            {tClara("connected")}
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