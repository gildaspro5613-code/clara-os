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

import { BrainSourceContext } from "./brain-source";
import type { Mission } from "@/modules/missions/types/Mission";

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

  /**
   * Information sources loaded for this cycle.
   */
  sources: BrainSourceContext[];

  /**
   * Capabilities available to Clara during this
   * cognitive cycle.
   */
  capabilities: Array<{
    id: string;
    name: string;
    description: string;
  }>;

  /**
   * Current operational mission, when one exists.
   */
  mission?: Mission;

}
