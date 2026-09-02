/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : QuickActionsPanel.tsx
 * Responsibility :
 * Displays Clara's most frequently used actions.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

export default function QuickActionsPanel() {
  const t = useTranslations("cockpitUi");
  const actions = [
    t("newMission"),
    t("agenda"),
    t("call"),
    t("notes"),
    t("brain"),
    t("automations"),
  ];

  return (
    <GlassPanel title={t("quickActions")}>
      <div className="grid grid-cols-2 gap-3">

        {actions.map((action) => (
          <button
            key={action}
            className="
              min-w-0
              min-h-16
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
            {action}
          </button>
        ))}

      </div>
    </GlassPanel>
  );
}
