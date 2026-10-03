import { Clara } from "@/lib/core/clara";
import { dispatchEvent } from "@/lib/core/event-bus";
import { saveSession } from "@/lib/core/store/session-store";
import { receiveMdProjectIntake } from "@/lib/intake/md-project-intake";
import {
  claimProjectIntakes,
  markProjectIntakeStatus,
  type ProjectIntakeInboxItem,
} from "@/lib/intake/md-project-intake-inbox";

const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_STALE_AFTER_SECONDS = 120;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function processItem(item: ProjectIntakeInboxItem): Promise<boolean> {
  try {
    const received = receiveMdProjectIntake(item.intake);
    const event = {
      ...received.event,
      id: item.eventId,
      context: {
        ...received.event.context,
        productId: item.productId,
        workspaceId: item.workspaceId,
        sessionId: item.sessionKey,
      },
    };

    const clara = new Clara(item.sessionKey, item.workspaceId);
    const session = await dispatchEvent(clara, event);
    session.updatedAt = new Date();
    await saveSession(session, item.sessionKey);
    await markProjectIntakeStatus(item.workspaceId, item.submissionId, "processed");
    return true;
  } catch (error) {
    await markProjectIntakeStatus(
      item.workspaceId,
      item.submissionId,
      "failed",
      error instanceof Error ? error.message : "UNKNOWN_PROCESSING_ERROR",
    );
    console.error("[Clara intake worker] processing failed", item.submissionId, error);
    return false;
  }
}

export async function runProjectIntakeWorker(): Promise<{
  claimed: number;
  processed: number;
  failed: number;
}> {
  const batchSize = positiveInteger(
    process.env.CLARA_PROJECT_INTAKE_WORKER_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
  );
  const staleAfterSeconds = positiveInteger(
    process.env.CLARA_PROJECT_INTAKE_WORKER_STALE_SECONDS,
    DEFAULT_STALE_AFTER_SECONDS,
  );

  const items = await claimProjectIntakes(batchSize, staleAfterSeconds);
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    if (await processItem(item)) processed += 1;
    else failed += 1;
  }

  return { claimed: items.length, processed, failed };
}
