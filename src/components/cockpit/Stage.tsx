import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import ClaraVoiceWidget from "@/components/cockpit/widgets/voice/ClaraVoiceWidget";
import GlassPanel from "@/components/ui/GlassPanel";
import { getTranslations } from "next-intl/server";

interface StageProps {
  session: ClaraSession;
  acquisition?: AcquisitionRecord | null;
  nativeScope?:boolean;
  displayFirstName?:string|null;
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

export default async function Stage({ session, acquisition,nativeScope=false,displayFirstName=null }: StageProps) {
  const mission = session.mission;

  return (
    <>
      <div data-historical-brief className="pointer-events-auto absolute left-[5%] top-[12%] z-20 hidden w-[25%] max-w-[360px] max-h-[45%] overflow-y-auto lg:block">
        <BriefPanel session={session} acquisition={acquisition} displayFirstName={displayFirstName}/>
      </div>

      <div data-historical-voice className="pointer-events-auto absolute left-[6%] top-[61%] z-20 hidden w-[23%] max-w-[330px] max-h-[35%] overflow-y-auto lg:block">
        <ClaraVoiceWidget disabled={nativeScope}/>
      </div>

      <div data-historical-agenda className="pointer-events-auto absolute right-[5%] top-[7%] z-20 hidden w-[28%] max-w-[420px] max-h-[35%] overflow-y-auto lg:block">
        <AgendaPanel />
      </div>

      <div data-historical-tasks className="pointer-events-auto absolute right-[5%] top-[61%] z-20 hidden w-[28%] max-w-[420px] max-h-[35%] overflow-y-auto lg:block">
        <MissionPanel mission={mission} />
      </div>

      <div className="relative z-20 flex min-w-0 flex-col gap-4 px-4 py-6 sm:px-6 lg:hidden">
        <BriefPanel session={session} acquisition={acquisition} displayFirstName={displayFirstName}/>
        <AgendaPanel/>
        <MissionPanel mission={mission}/>
        <ClaraVoiceWidget disabled={nativeScope}/>
      </div>
    </>
  );
}
