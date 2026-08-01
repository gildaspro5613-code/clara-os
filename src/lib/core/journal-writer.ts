/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : journal-writer.ts
 * Responsibility :
 * Creates Journal Entries describing
 * Clara's cognitive activity.
 * ============================================
 */

import {
  Recommendation,
} from "@/types";

import {
  JournalEntry,
  JournalEntryType,
} from "./journal-entry";

/**
 * Creates a cognitive journal entry.
 */
export function writeCognitiveEntry(
  recommendation: Recommendation,
): JournalEntry {

  return {

    id: crypto.randomUUID(),

    type: JournalEntryType.COGNITIVE,

    createdAt: new Date(),

    summary:
      recommendation.summary,

    details:
      recommendation.rationale,

    recommendation,

  };

}