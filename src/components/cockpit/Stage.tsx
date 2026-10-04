import type { ClaraSession } from "@/lib/core/session";

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import ClaraVoiceWidget from "@/components/cockpit/widgets/voice/ClaraVoiceWidget";
import GlassPanel from "@/components/ui/GlassPanel";
import { getTranslations } from "next-intl/server";

interface StageProps {
  session: ClaraSession;
}

async function EmptyMissionPanel() {
  const t = await getTranslations("cockpitUi");

  return (
    <GlassPanel>
      <div>
        <p className="text-xs uppercase tracking-[0.20em] text-white/50">{t("currentMission")}</p>
        <p className="mt-2 text-lg font-semibold">{t("noMission")}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{t("emptyMissionHelp")}</p>
      </div>
    </GlassPanel>
  );
}

interface MissionPanelProps {
  mission: ClaraSession["mission"];
}

async function MissionPanel({ mission }: MissionPanelProps) {
  return mission ? <TasksPanel mission={mission} /> : <EmptyMissionPanel />;
}

export default async function Stage({ session }: StageProps) {
  const mission = session.mission;

  return (
    <>
      <div className="pointer-events-auto absolute left-[5%] top-[12%] z-20 hidden w-[25%] max-w-[360px] lg:block">
        <BriefPanel session={session} />
      </div>

      <div className="pointer-events-auto absolute left-[6%] top-[61%] z-20 hidden w-[23%] max-w-[330px] lg:block">
        <ClaraVoiceWidget />
      </div>

      <div className="pointer-events-auto absolute right-[5%] top-[7%] z-20 hidden w-[28%] max-w-[420px] lg:block">
        <AgendaPanel />
      </div>

      <div className="pointer-events-auto absolute right-[5%] top-[61%] z-20 hidden w-[28%] max-w-[420px] lg:block">
        <MissionPanel mission={mission} />
      </div>

      <div className="pointer-events-none absolute left-4 right-4 top-[12%] z-20 flex flex-col gap-3 lg:hidden">
        <div className="pointer-events-auto">
          <BriefPanel session={session} />
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 right-4 top-[58%] z-20 flex flex-col gap-3 lg:hidden">
        <div className="pointer-events-auto">
          <MissionPanel mission={mission} />
        </div>
      </div>
    </>
  );
}
