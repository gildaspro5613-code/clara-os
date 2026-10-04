import AgendaWidget from "./agenda/AgendaWidget";
import MissionWidget from "./missions/MissionWidget";
import ClaraChatWidget from "./clara/ClaraChatWidget";
import WeatherWidget from "./weather/WeatherWidget";
import WazeWidget from "./waze/WazeWidget";

import AttentionPanel from "../panels/AttentionPanel";
import QuickActionsPanel from "../panels/QuickActionsPanel";
import SummaryPanel from "../panels/SummaryPanel";
import ConversationsPanel from "../panels/ConversationsPanel";
import AcquisitionDecisionPanel from "../panels/AcquisitionDecisionPanel";
import AcquisitionQualificationPanel from "../panels/AcquisitionQualificationPanel";
import {
  loadAcquisitionDecisionQueue,
  loadActiveAcquisitionQualifications,
} from "@/lib/acquisition/acquisition-store";
import { loadMissions } from "@/modules/missions/mission-store";
import { orchestrateMissions } from "@/modules/missions/mission-orchestrator";
import type { ClaraSession } from "@/lib/core/session";
import { getTranslations } from "next-intl/server";

interface CockpitWidgetsProps {
  session: ClaraSession;
}

export default async function CockpitWidgets({ session }: CockpitWidgetsProps) {
  const t = await getTranslations("cockpitUi");
  const workspaceId = process.env.CLARA_MD_WORKSPACE_ID?.trim()
    || process.env.CLARA_WORKSPACE_ID?.trim()
    || "melodie-digital";

  const [acquisitionDecisions, acquisitionQualifications, missions] = await Promise.all([
    loadAcquisitionDecisionQueue(workspaceId),
    loadActiveAcquisitionQualifications(workspaceId),
    loadMissions().catch(() => []),
  ]);
  const orchestration = orchestrateMissions(missions);

  return (
    <section aria-label={t("widgets")} className="w-full overflow-hidden bg-[#070B12]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 xl:px-8 xl:py-14">
        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <SummaryPanel session={session} />
          </div>
          <div className="min-w-0">
            <AttentionPanel mission={orchestration.interventionRequired[0] ?? orchestration.current} />
          </div>
          <div className="min-w-0">
            <QuickActionsPanel />
          </div>
        </div>

        {acquisitionQualifications.length > 0 && (
          <div className="mt-5">
            <AcquisitionQualificationPanel qualifications={acquisitionQualifications} />
          </div>
        )}

        {acquisitionDecisions.length > 0 && (
          <div className="mt-5">
            <AcquisitionDecisionPanel initialDecisions={acquisitionDecisions} />
          </div>
        )}

        <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0">
            <ConversationsPanel session={session} />
          </div>
          <div className="min-w-0">
            <AgendaWidget />
          </div>
        </div>

        <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <MissionWidget
              mission={orchestration.current}
              activeCount={orchestration.active.length}
              blockedCount={orchestration.blocked.length}
            />
          </div>
          <div className="min-w-0"><WazeWidget /></div>
          <div className="min-w-0"><WeatherWidget /></div>
        </div>

        <div className="mt-5">
          <ClaraChatWidget initialMessages={session.conversation} userFirstName={session.user.firstName} />
        </div>
      </div>
    </section>
  );
}
