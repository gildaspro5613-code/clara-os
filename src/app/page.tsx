import {loadNativeConversationNavigation} from "@/components/native/conversation-navigation";
import {nativeContext} from "@/lib/native/scoped-context";
import {loadMissions} from "@/modules/missions/mission-store";
import { nativePage,nativePageFence } from "@/lib/native/page-fence";
import {cookies} from 'next/headers';
import {cockpitLanding} from '@/lib/native/cockpit-landing';
import WorkspaceWelcome from '@/components/cockpit/WorkspaceWelcome';
export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import Cockpit from "@/components/cockpit/Cockpit";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export default async function HomePage() {
  let landing:'welcome'|'scoped'|'locked';
  try{
    landing=await cockpitLanding(new Request('https://native-selector.invalid',{headers:{cookie:(await cookies()).toString()}}));
  }catch{return nativePageFence();}
  if(landing==='welcome')return <WorkspaceWelcome/>;
  if(landing==='locked')return nativePageFence();
  return nativePage(async()=>{

  const operational = await resolveOperationalContext();
  const conversationNavigation=await loadNativeConversationNavigation();

  return (
    <MainLayout>
      <Cockpit conversationNavigation={conversationNavigation} nativeSessionId={nativeContext()!.scope.sessionId} nativeIntake={operational.acquisition?nativeContext()!.intakes.get(operational.acquisition.submissionId)??null:null} nativeMissions={await loadMissions()} session={operational.session} acquisition={operational.acquisition} />
    </MainLayout>
  );
  });
}
