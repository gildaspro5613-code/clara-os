/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : operational-journal-writer.ts
 * Responsibility :
 * Creates Journal entries for gated runtime
 * execution and verification outcomes.
 * ============================================
 */

import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import type { ExecutionCoordinatorResult } from "@/lib/runtime/execution-coordinator";

import { JournalEntryType, type JournalEntry } from "./journal-entry";

export function writeOperationalEntry(
  intent: ExecutionIntent,
  result: ExecutionCoordinatorResult,
): JournalEntry {
  const verification = result.verification;
  const runtimeResult = result.runtimeResult;

  const outcome = verification?.status ?? result.gate.outcome;
  const summary = `${intent.capabilityId}: ${outcome}`;

  const details = [
    `mode=${intent.mode}`,
    `gate=${result.gate.outcome}`,
    intent.missionId ? `mission=${intent.missionId}` : undefined,
    intent.missionTaskId ? `task=${intent.missionTaskId}` : undefined,
    runtimeResult ? `runtimeSuccess=${runtimeResult.success}` : undefined,
    verification ? `verification=${verification.status}` : undefined,
    verification?.message ?? runtimeResult?.message ?? result.gate.reason,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");

  return {
    id: crypto.randomUUID(),
    type: JournalEntryType.ACTION,
    createdAt: new Date(),
    summary,
    details,
  };
}
