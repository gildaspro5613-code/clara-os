// ============================================
// CLARA OS
// Cockpit Module
//
// File : TasksPanel.tsx
// Responsibility :
// Displays Clara's current mission.
//
// Presentation only.
// ============================================

import type { Mission } from "@/modules/missions/types/Mission";

import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

interface TasksPanelProps {
  mission: Mission;
}

export default function TasksPanel({
  mission,
}: TasksPanelProps) {
  const t = useTranslations("cockpitUi");
  return (
    <GlassPanel>

      <div>
        <p className="text-lg font-semibold">
          {mission.title}
        </p>

        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {mission.objective}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-white/60">
            {t("progress")}
          </span>

          <span className="text-sm font-semibold">
            {mission.progress} %
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{
              width: `${mission.progress}%`,
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

        <p className="text-xs uppercase tracking-[0.20em] text-white/50">
          {t("nextStep")}
        </p>

        <p className="mt-2 font-medium">
          {mission.nextAction ?? t("noNextStep")}
        </p>

      </div>

    </GlassPanel>
  );
}
