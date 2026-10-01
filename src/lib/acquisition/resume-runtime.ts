import { createHash } from "node:crypto";

import { Clara } from "@/lib/core/clara";
import { dispatchEvent } from "@/lib/core/event-bus";
import { loadSession, saveSession } from "@/lib/core/store/session-store";
import { EventType } from "@/types";
import type { AcquisitionRecord } from "./acquisition-store";

export function acquisitionSessionKey(record: AcquisitionRecord): string {
  return "external:md-project-intake:" +
    createHash("sha256")
      .update([
        record.qualification.source.system,
        record.workspaceId,
        record.submissionId,
      ].join("\u001f"))
      .digest("hex");
}

/**
 * Resume the durable Clara mission that owns this acquisition dossier.
 * A lifecycle transition alone is not considered a resume: Clara receives a
 * real MISSION_RESUMED event and can continue its authorized runtime work.
 */
export async function resumeAcquisitionRuntime(record: AcquisitionRecord): Promise<boolean> {
  const key = acquisitionSessionKey(record);
  const persisted = await loadSession(key);
  const missionId = persisted.mission?.id;
  if (!missionId) return false;

  const clara = new Clara(key, record.workspaceId);
  const session = await dispatchEvent(clara, {
    id: crypto.randomUUID(),
    type: EventType.MISSION_RESUMED,
    source: "CLARA_ACQUISITION_GOVERNANCE",
    timestamp: new Date(),
    payload: {
      missionId,
      submissionId: record.submissionId,
      lifecycleState: record.lifecycle.state,
    },
    context: {
      productId: record.qualification.source.system,
      workspaceId: record.workspaceId,
      sessionId: key,
      metadata: {
        acquisitionSubmissionId: record.submissionId,
        governanceResume: true,
      },
    },
  });
  await saveSession(session, key);
  return true;
}
