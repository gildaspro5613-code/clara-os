/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : memory.ts
 * Responsibility :
 * Represents Clara's available memory during
 * reasoning.
 * ============================================
 */

export interface Memory {
  /**
   * Recent conversation or events.
   */
  shortTerm: string[];

  /**
   * Persistent knowledge.
   */
  longTerm: string[];

  /**
   * Known facts about the current context.
   */
  facts: string[];
}