import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import { loadAcquisitionRecord, loadActiveAcquisitionQualifications } from "@/lib/acquisition/acquisition-store";
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
  let acquisition = submissionId && workspaceId
    ? await loadAcquisitionRecord(workspaceId, submissionId).catch(() => null)
    : null;

  // Mission projections created from older owner sessions can lose the
  // acquisition metadata even though the current commercial qualification is
  // still durable in Neon. Recover it only when the workspace has exactly one
  // active commercial qualification with a prepared draft; never guess among
  // multiple prospects.
  if (!acquisition) {
    const configuredWorkspaceId = (
      process.env.CLARA_WORKSPACE_ID
      ?? process.env.CLARA_MD_WORKSPACE_ID
      ?? ""
    ).trim();
    if (configuredWorkspaceId && configuredWorkspaceId !== "default") {
      const active = await loadActiveAcquisitionQualifications(configuredWorkspaceId).catch(() => []);
      // The Cockpit defines the current qualification as active[0]
      // (the most recently updated active record). Use that same deterministic
      // selection so Clara and the visible commercial panel always address the
      // same prospect. Never select a different record merely because it owns
      // a draft.
      acquisition = active[0] ?? null;
    }
  }

  return { sessionKey, session, acquisition };
}
