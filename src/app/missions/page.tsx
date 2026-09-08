export const dynamic = "force-dynamic";

import MainLayout from "@/components/layout/MainLayout";
import MissionsStage from "@/modules/missions/MissionsStage";
import { loadMissions } from "@/modules/missions/mission-store";
import { loadSession } from "@/lib/core/store/session-store";

export default async function MissionsPage() {
  let missions: Awaited<ReturnType<typeof loadMissions>> = [];
  let currentMissionId: string | null = null;

  try {
    const session = await loadSession();
    currentMissionId = session.mission?.id ?? null;
  } catch {
    // Keep the Missions route available even if session persistence is
    // temporarily unavailable. Mission data can still render independently.
    console.warn("[missions] session store unavailable; continuing without current mission context");
  }

  try {
    missions = await loadMissions();
  } catch {
    // The Missions UI must remain available even when the persistent
    // store is temporarily unavailable or not provisioned in a preview.
    // Do not log provider errors here: they may contain infrastructure
    // details that should not be exposed in application logs.
    console.warn("[missions] persistent store unavailable; rendering empty state");
  }

  // Compatibility repair for missions persisted before conversational/manual
  // steps were distinguished from blocked execution steps. Only the mission
  // currently owned by Clara's durable session is reclassified for display;
  // historical missions remain untouched until explicitly resumed/archived.
  if (currentMissionId) {
    missions = missions.map((mission) => {
      if (mission.id !== currentMissionId || mission.status !== "blocked") {
        return mission;
      }

      const nextPendingTask = mission.tasks.find((task) => !task.completed);

      if (!nextPendingTask || nextPendingTask.execution) {
        return mission;
      }

      return {
        ...mission,
        status: "active",
      };
    });
  }

  return (
    <MainLayout>
      <MissionsStage initialMissions={missions} />
    </MainLayout>
  );
}
