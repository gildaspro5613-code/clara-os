export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import MissionsStage from "@/modules/missions/MissionsStage";
import { loadMissions } from "@/modules/missions/mission-store";

export default async function MissionsPage() {
  let missions = [];

  try {
    missions = await loadMissions();
  } catch {
    // The Missions UI must remain available even when the persistent
    // store is temporarily unavailable or not provisioned in a preview.
    // Do not log provider errors here: they may contain infrastructure
    // details that should not be exposed in application logs.
    console.warn("[missions] persistent store unavailable; rendering empty state");
  }

  return (
    <MainLayout>
      <MissionsStage initialMissions={missions} />
    </MainLayout>
  );
}
