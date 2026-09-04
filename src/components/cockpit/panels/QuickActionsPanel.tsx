/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : QuickActionsPanel.tsx
 * Responsibility :
 * Displays Clara's most frequently used actions.
 * ============================================
 */

import Link from "next/link";
import { useTranslations } from "next-intl";

import GlassPanel from "@/components/ui/GlassPanel";

export default function QuickActionsPanel() {
  const t = useTranslations("cockpitUi");
  const actions = [
    {
      id: "new-mission",
      label: t("newMission"),
      href: "/clara?intent=new-mission",
    },
    {
      id: "agenda",
      label: t("agenda"),
      href: "/agenda",
    },
    {
      id: "call",
      label: t("call"),
      href: "/telephonie",
    },
    {
      id: "notes",
      label: t("notes"),
      href: "/journal",
    },
    {
      id: "brain",
      label: t("brain"),
      href: "/brain",
    },
    {
      id: "automations",
      label: t("automations"),
      href: "/automatisations",
    },
  ];

  return (
    <GlassPanel title={t("quickActions")}>
      <div className="grid grid-cols-2 gap-3">

        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="
              min-w-0
              w-full
              min-h-16
              flex
              items-center
              justify-center
              overflow-hidden
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-2.5
              py-3
              text-center
              text-sm
              font-medium
              leading-tight
              text-white/90
              whitespace-normal
              break-words
              hyphens-auto
              transition-all
              duration-200
              hover:bg-white/10
              hover:border-white/20
              hover:scale-[1.02]
              active:scale-[0.98]
              sm:px-3
              sm:py-4
            "
          >
            {action.label}
          </Link>
        ))}

      </div>
    </GlassPanel>
  );
}
