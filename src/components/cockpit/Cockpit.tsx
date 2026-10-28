import type {NativeConversationListProps} from "@/components/native/NativeConversationList";
import type {MdProjectIntake} from "@/types";
import type {Mission} from "@/modules/missions/types/Mission";
import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";

import Hero from "./hero/Hero";
import CockpitLayout from "./CockpitLayout";
import CockpitWidgets from "./widgets/CockpitWidgets";

interface CockpitProps {
  nativeSessionId?:string;
  conversationNavigation?:NativeConversationListProps|null;
  session: ClaraSession;
  nativeMissions?:Mission[];
  nativeIntake?:MdProjectIntake|null;
  acquisition?: AcquisitionRecord | null;
}

export default function Cockpit({
  session,
  acquisition,
  nativeMissions,
  nativeIntake,
  nativeSessionId,conversationNavigation,
}: CockpitProps) {
  return (
    <CockpitLayout hero={<Hero nativeMissions={nativeMissions} nativeScope={nativeMissions!==undefined} session={session} acquisition={acquisition} />}>
      <CockpitWidgets conversationNavigation={conversationNavigation} nativeSessionId={nativeSessionId} nativeIntake={nativeIntake} nativeMissions={nativeMissions} session={session} acquisition={acquisition} />
    </CockpitLayout>
  );
}
