import type {ClaraSession} from "@/lib/core/session";
import type {AcquisitionRecord} from "@/lib/acquisition/acquisition-store";
import BriefPanel from "./panels/BriefPanel";
import TasksPanel from "./panels/TasksPanel";
import ClaraVoiceWidget from "@/components/clara/ClaraVoiceWidget";
import GlassPanel from "@/components/ui/GlassPanel";
import Link from "next/link";
import {getTranslations} from "next-intl/server";

interface StageProps {session:ClaraSession;acquisition?:AcquisitionRecord|null;nativeScope?:boolean;}

/** Historical main composition; content and authority come from the existing runtime. */
export default async function Stage({session,acquisition,nativeScope=false}:StageProps){
 const t=await getTranslations('cockpitUi');
 const mission=session.mission?<TasksPanel mission={session.mission}/>:<GlassPanel title={t('currentMission')}>
  <p className="text-sm text-white/70">{t('noMission')}</p>
  <Link href="/missions" className="mt-4 inline-block text-cyan-200 underline">{t('openMissions')}</Link>
 </GlassPanel>;
 const brief=<BriefPanel session={session} acquisition={acquisition}/>;
 // The historical voice widget is visible, but never enables an uncertified native path.
 const voice=<ClaraVoiceWidget disabled={nativeScope}/>;
 return <>
  <div data-historical-brief className="pointer-events-auto absolute left-[5%] top-[12%] max-h-[63%] z-20 hidden w-[25%] max-w-[360px] overflow-y-auto lg:block">{brief}</div>
  <div data-historical-tasks className="pointer-events-auto absolute bottom-[25%] right-[5%] top-[18%] z-20 hidden w-[25%] max-w-[360px] overflow-y-auto lg:block">{mission}</div>
  <div data-historical-voice className="pointer-events-auto absolute bottom-[6%] left-1/2 z-20 hidden w-[260px] -translate-x-1/2 lg:block">{voice}</div>
  <div className="relative z-20 flex min-w-0 flex-col gap-4 px-4 py-6 sm:px-6 lg:hidden">
   {brief}{mission}{voice}
  </div>
 </>;
}
