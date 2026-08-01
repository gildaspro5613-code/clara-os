/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : brain-context.ts
 * Responsibility :
 * Aggregates every information source required
 * by Clara's Brain during one reasoning cycle.
 * ============================================
 */

import {
  Context,
  Memory,
} from "@/types";

import {
  KnowledgeEngine,
} from "@/lib/knowledge";

/**
 * Complete cognitive context used during
 * one execution cycle.
 */
export interface BrainContext {

  /**
   * Current execution context.
   */
  context: Context;

  /**
   * Clara's knowledge.
   */
  knowledge: KnowledgeEngine;

  /**
   * Relevant memory.
   */
  memory: Memory;

}