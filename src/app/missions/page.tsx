import MainLayout from "@/components/layout/MainLayout";
import MissionsStage from "@/modules/missions/MissionsStage";
import { loadSession } from "@/lib/core/store/session-store";

export default function MissionsPage() {
  const session = loadSession();

  return (
    <MainLayout>
      <MissionsStage initialMission={session.mission ?? undefined} />
    </MainLayout>
  );
}
