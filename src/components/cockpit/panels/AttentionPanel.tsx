/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : AttentionPanel.tsx
 * Responsibility :
 * Displays Clara's current priority focus.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import type { Mission } from "@/modules/missions/types/Mission";
import { useTranslations } from "next-intl";

interface AttentionPanelProps {
  mission: Mission | null;
}

export default function AttentionPanel({
  mission,
}: AttentionPanelProps) {
  const t = useTranslations("cockpitUi");
  const priorityT = useTranslations("brainPage.priorities");

  const priorityLabel = mission
    ? mission.priority === "critical"
      ? priorityT("critical")
      : mission.priority === "high"
        ? priorityT("high")
        : mission.priority === "low"
          ? priorityT("low")
          : priorityT("normal")
    : priorityT("normal");

  return (
    <GlassPanel title={t("attention")}>
      <div className="space-y-4">

        <div className="flex min-w-0 items-start gap-3">

          <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />

          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug sm:text-lg">
              {mission?.nextAction ?? t("noNextStep")}
            </p>

            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/70">
              {mission?.objective ?? t("attentionDescription")}
            </p>
          </div>

        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">

          <div className="flex min-w-0 items-center justify-between gap-3">

            <span className="text-sm text-white/60">
              {t("priority")}
            </span>

            <span className="shrink-0 text-sm font-medium text-amber-300">
              {priorityLabel}
            </span>

          </div>

        </div>

      </div>
    </GlassPanel>
  );
}
