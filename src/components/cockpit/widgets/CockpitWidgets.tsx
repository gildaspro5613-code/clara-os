import ContextRequiredPanel from "../panels/ContextRequiredPanel";
import Link from 'next/link';
import GlassPanel from "@/components/ui/GlassPanel";
import type {NativeConversationListProps} from "@/components/native/NativeConversationList";
import {nativeThreadCertified} from '@/lib/native/scoped-context';
import type {MdProjectIntake} from "@/types";
import type {Mission} from "@/modules/missions/types/Mission";
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
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import { getTranslations } from "next-intl/server";

interface CockpitWidgetsProps {
  nativeSessionId?:string;
  conversationNavigation?:NativeConversationListProps|null;
  session?: ClaraSession;
  workspaceOnly?:boolean;
  nativeMissions?:Mission[];
  nativeIntake?:MdProjectIntake|null;
  acquisition?: AcquisitionRecord | null;
}

export default async function CockpitWidgets({ session, acquisition,nativeMissions,nativeIntake,nativeSessionId,conversationNavigation,workspaceOnly=false }: CockpitWidgetsProps) {
  const t = await getTranslations("cockpitUi");
  if(workspaceOnly){
    const ui=await getTranslations('ui');
    return <section data-workspace-widgets aria-label={t('widgets')} className="w-full overflow-hidden bg-[#070B12]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 xl:px-8 xl:py-14">
        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ContextRequiredPanel title={t('dailySummary')} href="/journal"/>
          <ContextRequiredPanel title={t('attention')} href="/missions"/>
          <QuickActionsPanel workspaceOnly/>
        </div>
        <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[1.35fr_1fr]">
          <ContextRequiredPanel title={t('latestConversations')} href="/conversations"/>
          <ContextRequiredPanel title={t('agenda')} href="/agenda"/>
        </div>
        <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ContextRequiredPanel title={t('currentMission')} href="/missions"/>
          <ContextRequiredPanel title={t('navigation')} href="/agenda"/>
          <ContextRequiredPanel title={t('weather')}/>
        </div>
        <div className="mt-5"><GlassPanel title="Clara"><p className="text-sm text-white/65">{ui('cockpitProjectRequired')}</p>
          <Link prefetch={false} href="/documents" className="mt-4 inline-block text-sm text-cyan-200 underline">{ui('uiDocumentSearch')} →</Link>
          <textarea aria-label="Clara" disabled className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 p-3 disabled:opacity-50" placeholder={ui('cockpitProjectRequired')}/>
        </GlassPanel></div>
      </div>
    </section>;
  }
  if(!session)return null;
  const workspaceId = process.env.CLARA_MD_WORKSPACE_ID?.trim()
    || process.env.CLARA_WORKSPACE_ID?.trim()
    || "melodie-digital";

  const [acquisitionDecisions, acquisitionQualifications, missions] = nativeMissions ? [[],[],nativeMissions] : await Promise.all([
    loadAcquisitionDecisionQueue(workspaceId),
    loadActiveAcquisitionQualifications(workspaceId),
    loadMissions().catch(() => []),
  ]);
  const orchestration = orchestrateMissions(missions);
  const currentMission = session.mission;
  const orderedQualifications = acquisition
    ? [
        acquisition,
        ...acquisitionQualifications.filter(
          (item) => item.submissionId !== acquisition.submissionId,
        ),
      ]
    : acquisitionQualifications;

  return (
    <section aria-label={t("widgets")} className="w-full overflow-hidden bg-[#070B12]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 xl:px-8 xl:py-14">
        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <SummaryPanel session={session} />
          </div>
          <div className="min-w-0">
            <AttentionPanel mission={currentMission} />
          </div>
          <div className="min-w-0">
            <QuickActionsPanel />
          </div>
        </div>

        {orderedQualifications.length > 0 && (
          <div id="acquisition" className="mt-5 scroll-mt-6">
            <AcquisitionQualificationPanel nativeIntake={nativeIntake} qualifications={orderedQualifications} />
          </div>
        )}

        {acquisitionDecisions.length > 0 && (
          <div className="mt-5">
            <AcquisitionDecisionPanel initialDecisions={acquisitionDecisions} />
          </div>
        )}

        <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0">
            <ConversationsPanel conversationNavigation={conversationNavigation} session={session} />
          </div>
          <div className="min-w-0">
            <AgendaWidget />
          </div>
        </div>

        <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <MissionWidget missions={missions} nativeScope={nativeMissions!==undefined}
              mission={currentMission}
              activeCount={orchestration.active.length}
              blockedCount={orchestration.blocked.length}
            />
          </div>
          <div className="min-w-0"><WazeWidget /></div>
          <div className="min-w-0"><WeatherWidget /></div>
        </div>

        <div className="mt-5">
          <ClaraChatWidget nativeThreadReadOnly={nativeMissions!==undefined&&!nativeThreadCertified(session)} key={nativeSessionId} nativeSessionId={nativeSessionId} initialMessages={session.conversation} userFirstName={session.user.firstName} />
        </div>
      </div>
    </section>
  );
}
