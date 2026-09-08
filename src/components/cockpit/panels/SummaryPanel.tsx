/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : SummaryPanel.tsx
 * Responsibility :
 * Displays Clara's daily summary.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

export default function SummaryPanel() {
  const t = useTranslations("cockpitUi");
  return (
    <GlassPanel title={t("dailySummary")}>
      <div className="space-y-5">

        <div className="flex items-center justify-between">
          <span className="text-white/70">{t("completedTasks")}</span>
          <span className="font-semibold">12</span>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center justify-between">
          <span className="text-white/70">{t("conversations")}</span>
          <span className="font-semibold">18</span>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center justify-between">
          <span className="text-white/70">{t("automations")}</span>
          <span className="font-semibold">7</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

          <p className="text-xs uppercase tracking-[0.20em] text-white/50">
            {t("today")}
          </p>

          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {t("progressSummary")}
          </p>

        </div>

      </div>
    </GlassPanel>
  );
}
