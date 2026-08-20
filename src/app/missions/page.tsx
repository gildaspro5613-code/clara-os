export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import MissionsStage from "@/modules/missions/MissionsStage";
import { loadSession } from "@/lib/core/store/session-store";

export default async function MissionsPage() {
  const session = await loadSession();

  return (
    <MainLayout>
      <MissionsStage initialMission={session.mission ?? undefined} />
    </MainLayout>
  );
}
