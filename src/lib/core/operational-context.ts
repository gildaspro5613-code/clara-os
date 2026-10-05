import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import { loadAcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import type { ClaraSession } from "./session";
import {
  loadSession,
  loadSessionOwningMission,
} from "./store/session-store";
import { getCurrentMission } from "@/modules/missions/current-mission";
import { projectOwnedSession } from "./operational-session-projection";

export interface OperationalContext {
  sessionKey: string;
  session: ClaraSession;
  acquisition: AcquisitionRecord | null;
}

function stringMetadata(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Projects the current Mission together with the durable session that owns it.
 * It never merges sessions and never persists the projection into `default`.
 */
export async function resolveOperationalContext(): Promise<OperationalContext> {
  const mission = await getCurrentMission();
  const owner = mission
    ? await loadSessionOwningMission(mission.id).catch(() => null)
    : null;
  const defaultSession = owner?.session ?? await loadSession();
  const projected = projectOwnedSession(mission, owner, defaultSession);
  const { sessionKey, session } = projected;

  const dashboard = session.brainDashboard;
  const submissionId = dashboard?.acquisition?.submissionId
    ?? stringMetadata(dashboard?.context.metadata?.acquisitionSubmissionId);
  const workspaceId = stringMetadata(dashboard?.context.metadata?.workspaceId)
    ?? stringMetadata(dashboard?.context.event.context?.workspaceId);
  const acquisition = submissionId && workspaceId
    ? await loadAcquisitionRecord(workspaceId, submissionId).catch(() => null)
    : null;

  return { sessionKey, session, acquisition };
}
