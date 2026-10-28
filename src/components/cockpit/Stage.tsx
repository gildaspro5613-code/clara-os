import MissionWidget from "@/components/cockpit/widgets/missions/MissionWidget";
import type {Mission} from "@/modules/missions/types/Mission";
import Link from "next/link";
import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";

import BriefPanel from "@/components/cockpit/panels/BriefPanel";
import MailOverviewPanel from "@/components/cockpit/panels/MailOverviewPanel";
import TasksPanel from "@/components/cockpit/panels/TasksPanel";
import AgendaPanel from "@/components/cockpit/panels/AgendaPanel";
import ClaraVoiceWidget from "@/components/cockpit/widgets/voice/ClaraVoiceWidget";
import GlassPanel from "@/components/ui/GlassPanel";
import { getTranslations } from "next-intl/server";

interface StageProps {
  nativeScope?: boolean;
  nativeMissions?:Mission[];
  session: ClaraSession;
  acquisition?: AcquisitionRecord | null;
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
  missions?:Mission[];
}

async function MissionPanel({ mission,missions }: MissionPanelProps) {
  if(missions)return <MissionWidget mission={mission} missions={missions} nativeScope />;
  return mission ? <TasksPanel mission={mission} /> : <EmptyMissionPanel />;
}

export default async function Stage({ session, acquisition, nativeScope = false,nativeMissions }: StageProps) {
  const mission = session.mission;
  const native = nativeScope;
  const ui = await getTranslations("ui");
  const voiceStatus = <GlassPanel className="!h-auto shrink-0"><Link href="/telephonie" className="text-cyan-200">{ui("uiVoiceStatus")}</Link></GlassPanel>;

  return (
    <>
      <div data-hero-column className="pointer-events-auto absolute bottom-[7%] left-[5%] top-[12%] z-20 hidden w-[25%] max-w-[360px] flex-col gap-4 overflow-y-auto lg:flex">
        <BriefPanel session={session} acquisition={acquisition} />
        {native ? voiceStatus : <ClaraVoiceWidget />}
      </div>

      <div data-hero-column className="pointer-events-auto absolute bottom-[7%] right-[5%] top-[7%] z-20 hidden w-[28%] max-w-[420px] flex-col gap-4 overflow-y-auto lg:flex">
        <AgendaPanel />
        {native&&<MailOverviewPanel />}
        <MissionPanel mission={mission} missions={nativeMissions} />
      </div>

      {/* Mobile: keep panels in document flow so long text and translated
          content never overlap at fixed viewport percentages. */}
      <div className="relative z-20 flex w-full min-w-0 flex-col gap-4 px-4 py-6 sm:px-6 lg:hidden">
        <BriefPanel session={session} acquisition={acquisition} />
        {native&&<MailOverviewPanel />}
        <MissionPanel mission={mission} missions={nativeMissions} />
      </div>
    </>
  );
}
