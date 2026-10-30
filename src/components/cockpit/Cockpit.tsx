import type {MdProjectIntake} from "@/types";
import type {Mission} from "@/modules/missions/types/Mission";
import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";

import Hero from "./hero/Hero";
import CockpitLayout from "./CockpitLayout";
import CockpitWidgets from "./widgets/CockpitWidgets";

interface CockpitProps {
  nativeSessionId?:string;
  session: ClaraSession;
  displayFirstName?:string|null;
  nativeMissions?:Mission[];
  nativeIntake?:MdProjectIntake|null;
  acquisition?: AcquisitionRecord | null;
}

export default function Cockpit({
  session,displayFirstName=null,
  acquisition,
  nativeMissions,
  nativeIntake,
  nativeSessionId,
}: CockpitProps) {
  return (
    <CockpitLayout hero={<Hero displayFirstName={displayFirstName} nativeScope={nativeMissions!==undefined} session={session} acquisition={acquisition} />}>
      <CockpitWidgets displayFirstName={displayFirstName} nativeSessionId={nativeSessionId} nativeIntake={nativeIntake} nativeMissions={nativeMissions} session={session} acquisition={acquisition} />
    </CockpitLayout>
  );
}
