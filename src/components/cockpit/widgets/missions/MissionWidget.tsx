import Link from "next/link";
import type { Mission } from "@/modules/missions/types/Mission";

import GlassPanel from "@/components/ui/GlassPanel";

interface MissionWidgetProps {
  mission: Mission | null;
}

export default function MissionWidget({
  mission,
}: MissionWidgetProps) {
  if (!mission) {
    return (
      <GlassPanel
        title="Mission"
      >
        <p className="text-sm text-white/55">
          Aucune mission active.
        </p>

        <Link
          href="/missions"
          className="mt-4 inline-flex text-xs text-cyan-400 transition hover:text-cyan-300"
        >
          Ouvrir les missions →
        </Link>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      title="Mission actuelle"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white">
            {mission.title}
          </h2>

          <p className="mt-1 text-sm text-white/55">
            {mission.nextAction ?? "Aucune prochaine action définie."}
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
          {mission.status}
        </span>

        <Link
          href="/missions"
          className="text-xs text-white/45 transition hover:text-white"
        >
          Voir les missions →
        </Link>
      </div>
    </GlassPanel>
  );
}
