/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : journal-repository.ts
 * Responsibility :
 * Defines the persistence boundary for Journal entries.
 * ============================================
 */

import type { JournalEntry } from "./journal-entry";

/**
 * Server-side persistence contract for Clara's operational Journal.
 *
 * The Journal records what actually happened. Storage implementations stay
 * outside Core so Brain and Runtime remain independent from a database vendor.
 */
export interface JournalRepository {
  append(entry: JournalEntry): Promise<void>;
  recent(limit: number): Promise<JournalEntry[]>;
}
