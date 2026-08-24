export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import MissionsStage from "@/modules/missions/MissionsStage";
import { loadMissions } from "@/modules/missions/mission-store";

export default async function MissionsPage() {
  const missions = await loadMissions();

  return (
    <MainLayout>
      <MissionsStage initialMissions={missions} />
    </MainLayout>
  );
}
