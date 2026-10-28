import { nativePage } from "@/lib/native/page-fence";
export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import MissionsStage from "@/modules/missions/MissionsStage";
import { loadMissions } from "@/modules/missions/mission-store";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export default async function MissionsPage({searchParams}:{searchParams?:Promise<{mission?:string}>}={}) {
  const requestedMission=(await searchParams)?.mission;
  return nativePage(async()=>{

  let missions: Awaited<ReturnType<typeof loadMissions>> = [];

  try {
    missions = await loadMissions();
  } catch {
    // The Missions UI must remain available even when the persistent
    // store is temporarily unavailable or not provisioned in a preview.
    // Do not log provider errors here: they may contain infrastructure
    // details that should not be exposed in application logs.
    console.warn("[missions] persistent store unavailable; rendering empty state");
  }

  const currentMissionId = (await resolveOperationalContext()).session.mission?.id ?? null;

  // Show the persisted business status on every surface. A missing execution
  // descriptor is not evidence that a blocked mission has become active.

  return (
    <MainLayout>
      <MissionsStage initialMissions={missions} currentMissionId={currentMissionId} initialSelectedMissionId={missions.find(m=>m.id===requestedMission)?.id} selectionUnavailable={!!requestedMission&&!missions.some(m=>m.id===requestedMission)} />
    </MainLayout>
  );
  });
}
