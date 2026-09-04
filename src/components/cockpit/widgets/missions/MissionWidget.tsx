import Link from "next/link";
import type { Mission } from "@/modules/missions/types/Mission";

import GlassPanel from "@/components/ui/GlassPanel";
import { getTranslations } from "next-intl/server";

interface MissionWidgetProps {
  mission: Mission | null;
}

export default async function MissionWidget({
  mission,
}: MissionWidgetProps) {
  const t = await getTranslations("cockpitUi");
  if (!mission) {
    return (
      <GlassPanel
        title={t("mission")}
      >
        <p className="text-sm text-white/55">
          {t("noMission")}
        </p>

        <Link
          href="/missions"
          className="mt-4 inline-flex text-xs text-cyan-400 transition hover:text-cyan-300"
        >
          {t("openMissions")}
        </Link>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      title={t("currentMission")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white">
            {mission.title}
          </h2>

          <p className="mt-1 text-sm text-white/55">
            {mission.nextAction ?? t("noNextAction")}
          </p>
        </div>

        <span className="shrink-0 text-sm font-semibold text-cyan-400">
          {mission.progress} %
        </span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-400"
          style={{
            width: `${mission.progress}%`,
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-white/35">
          {t(`missionStatus.${mission.status}`)}
        </span>

        <Link
          href="/missions"
          className="text-xs text-white/45 transition hover:text-white"
        >
          {t("viewMissions")}
        </Link>
      </div>
    </GlassPanel>
  );
}
