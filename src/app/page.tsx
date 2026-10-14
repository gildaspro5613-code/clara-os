import {nativeContext} from "@/lib/native/scoped-context";
import {loadMissions} from "@/modules/missions/mission-store";
import { nativePage } from "@/lib/native/page-fence";
export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import Cockpit from "@/components/cockpit/Cockpit";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export default async function HomePage() {
  return nativePage(async()=>{

  const operational = await resolveOperationalContext();

  return (
    <MainLayout>
      <Cockpit nativeIntake={operational.acquisition?nativeContext()!.intakes.get(operational.acquisition.submissionId)??null:null} nativeMissions={await loadMissions()} session={operational.session} acquisition={operational.acquisition} />
    </MainLayout>
  );
  });
}
