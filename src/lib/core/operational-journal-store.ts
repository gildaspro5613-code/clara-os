import { sql } from "./store/database";
import { JournalEntryType, type JournalEntry } from "./journal-entry";
import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import type { RuntimeResult } from "@/lib/runtime/runtime-result";
import type { VerificationResult } from "@/lib/runtime/verification";

let schemaReady: Promise<void> | null = null;

async function ensureOperationalJournalSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS clara_operational_journal (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        summary TEXT NOT NULL,
        details TEXT,
        mission_id TEXT,
        mission_task_id TEXT,
        capability_id TEXT,
        verification_status TEXT
      )
    `.then(() => undefined).catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function recordVerifiedExecution(input: {
  intent: ExecutionIntent;
  runtimeResult: RuntimeResult;
  verification: VerificationResult;
}): Promise<JournalEntry> {
  const { intent, runtimeResult, verification } = input;
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    type: JournalEntryType.ACTION,
    createdAt: new Date(),
    summary: verification.message,
    details: JSON.stringify({
      intentId: intent.id,
      mode: intent.mode,
      capabilityId: intent.capabilityId,
      missionId: intent.missionId,
      missionTaskId: intent.missionTaskId,
      runtimeSuccess: runtimeResult.success,
      verificationStatus: verification.status,
    }),
  };

  await ensureOperationalJournalSchema();
  await sql`
    INSERT INTO clara_operational_journal (
      id, type, created_at, summary, details,
      mission_id, mission_task_id, capability_id, verification_status
    ) VALUES (
      ${entry.id}, ${entry.type}, ${entry.createdAt.toISOString()},
      ${entry.summary}, ${entry.details ?? null},
      ${intent.missionId ?? null}, ${intent.missionTaskId ?? null},
      ${intent.capabilityId}, ${verification.status}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  return entry;
}
