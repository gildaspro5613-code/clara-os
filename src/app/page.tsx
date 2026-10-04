export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import Cockpit from "@/components/cockpit/Cockpit";
import { loadSession } from "@/lib/core/store/session-store";
import { getCurrentMission } from "@/modules/missions/current-mission";

export default async function HomePage() {
  const [session, durableMission] = await Promise.all([
    loadSession(),
    getCurrentMission(),
  ]);

  // The Mission Store is the durable operational source of truth. Hydrate the
  // page-level session once so Hero, widgets, summaries and conversations all
  // see the same mission instead of mixing a stale session pointer with the
  // durable mission selected elsewhere in the Cockpit.
  const operationalSession = {
    ...session,
    mission: durableMission ?? session.mission,
  };

  return (
    <MainLayout>
      <Cockpit session={operationalSession} />
    </MainLayout>
  );
}
