/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : journal-entry.ts
 * Responsibility :
 * Represents one entry written in Clara's
 * operational journal.
 * ============================================
 */

import {
  Recommendation,
} from "@/types";

/**
 * Type of journal entry.
 */
export enum JournalEntryType {

  SYSTEM = "SYSTEM",

  COGNITIVE = "COGNITIVE",

  ACTION = "ACTION",

  LEARNING = "LEARNING",

}

/**
 * One entry written by Clara.
 */
export interface JournalEntry {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Entry type.
   */
  type: JournalEntryType;

  /**
   * Creation date.
   */
  createdAt: Date;

  /**
   * Short summary.
   */
  summary: string;

  /**
   * Optional detailed explanation.
   */
  details?: string;

  /**
   * Recommendation produced during
   * this cognitive cycle.
   */
  recommendation?: Recommendation;

}