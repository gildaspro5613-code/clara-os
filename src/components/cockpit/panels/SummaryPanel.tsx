/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : SummaryPanel.tsx
 * Responsibility :
 * Displays Clara's current operational summary.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import type { ClaraSession } from "@/lib/core/session";
import { useTranslations } from "next-intl";

interface SummaryPanelProps {
  session: ClaraSession;
}

export default function SummaryPanel({
  session,
}: SummaryPanelProps) {
  const t = useTranslations("cockpitUi");
  const mission = session.mission;
  const completedTasks = mission?.tasks.filter((task) => task.completed).length ?? 0;
  const userTurns = session.conversation.filter((message) => message.role === "user").length;
  const progress = mission?.progress ?? 0;
  const latestClaraMessage = [...session.conversation]
    .reverse()
    .find((message) => message.role === "clara");

  return (
    <GlassPanel title={t("dailySummary")}>
      <div className="space-y-5">

        <div className="flex items-center justify-between">
          <span className="text-white/70">{t("completedTasks")}</span>
          <span className="font-semibold">{completedTasks}</span>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center justify-between">
          <span className="text-white/70">{t("conversations")}</span>
          <span className="font-semibold">{userTurns}</span>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center justify-between">
          <span className="text-white/70">{t("progress")}</span>
          <span className="font-semibold">{progress}%</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

          <p className="text-xs uppercase tracking-[0.20em] text-white/50">
            {mission?.title ?? t("today")}
          </p>

          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-white/75">
            {latestClaraMessage?.content ?? mission?.objective ?? t("progressSummary")}
          </p>

        </div>

      </div>
    </GlassPanel>
  );
}
