/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : memory.ts
 * Responsibility :
 * Loads the memory available to the Brain.
 * ============================================
 */

import { Context, Memory } from "@/types";

/**
 * Load the memory associated with the current context.
 *
 * This is the first implementation of Clara's Brain.
 * It returns an empty memory that will later be
 * connected to the Memory module.
 */
export function loadMemory(_context: Context): Memory {
  return {
    shortTerm: [],
    longTerm: [],
    facts: [],
  };
}