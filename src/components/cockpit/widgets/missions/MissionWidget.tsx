import Link from "next/link";
import type { Mission } from "@/modules/missions/types/Mission";

import GlassPanel from "@/components/ui/GlassPanel";
import { getTranslations } from "next-intl/server";

interface MissionWidgetProps {
  mission: Mission | null;
  nativeScope?:boolean;
  missions?:Mission[];
  activeCount?: number;
  blockedCount?: number;
}

export default async function MissionWidget({
  mission,
  nativeScope=false,
  missions,
  activeCount = 0,
  blockedCount = 0,
}: MissionWidgetProps) {
  const ui = await getTranslations("ui");

  const t = await getTranslations("cockpitUi");
  if (missions) return <GlassPanel title={t("openMissions")}>
    <ul className="max-h-80 space-y-3 overflow-y-auto">
      {missions.map(item=><li key={item.id} className="rounded-xl border border-white/10 p-3">
        <Link href={`/missions?mission=${encodeURIComponent(item.id)}`} className="block font-medium text-cyan-100">{item.title}</Link>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-white/65"><span>{t(`missionStatus.${item.status}`)}</span><span>{item.progress} %</span></div>
      </li>)}
    </ul>
    {!missions.length&&<p className="text-sm text-white/60">{ui("noCurrentFocus")}</p>}
    <Link href="/missions" className="mt-4 inline-block text-sm text-cyan-300">{ui("viewAllMissions")}</Link>
  </GlassPanel>;
  if (!mission) {
    return (
      <GlassPanel title={t("mission")}>
        <p className="text-sm text-white/55">{ui("noCurrentFocus")}</p>
        <p className="mt-3 text-xs text-white/45">{ui("missionScope")}</p>
        <p className="mt-2 text-xs text-white/45">{ui(nativeScope?"nativeScopedActiveCount":"registryActiveCount", {count: activeCount})}</p>
        <Link href="/missions" className="mt-4 inline-flex text-xs text-cyan-400 transition hover:text-cyan-300">
          {t("openMissions")}
        </Link>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel title={ui("currentOperationalMission")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white">{mission.title}</h2>
          <p className="mt-1 text-sm text-white/55">{ui("reviewNextAction")}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-cyan-400">{mission.progress} %</span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${mission.progress}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span>{ui(nativeScope?"nativeScopedActiveCount":"registryActiveCount",{count:activeCount})}</span>
        {blockedCount > 0 && <span>· {ui("blockedMissionCount",{count:blockedCount})}</span>}
        <span>· {t(`missionStatus.${mission.status}`)}</span>
      </div>

      <Link href="/missions" className="mt-4 inline-flex text-xs text-cyan-400 transition hover:text-cyan-300">{" "}{ui("viewAllMissions")}{" "}</Link>
    </GlassPanel>
  );
}
