/**
 * ============================================
 * CLARA OS
 * Academy Module
 * --------------------------------------------
 * File : knowledge-builder.ts
 * Responsibility :
 * Transforms validated educational resources
 * into structured Knowledge Modules.
 * ============================================
 */

import { Training } from "./training";
import { TrainingSource } from "./training-source";

/**
 * Standard knowledge structure
 * produced by Clara Academy.
 */
export interface KnowledgeModule {

  /**
   * Module identifier.
   */
  id: string;

  /**
   * Module title.
   */
  title: string;

  /**
   * Functional domain.
   */
  domain: string;

  /**
   * Main concepts.
   */
  concepts: string[];

  /**
   * Professional vocabulary.
   */
  vocabulary: string[];

  /**
   * Procedures.
   */
  procedures: string[];

  /**
   * Business rules.
   */
  rules: string[];

  /**
   * Best practices.
   */
  bestPractices: string[];

  /**
   * Practical examples.
   */
  examples: string[];

  /**
   * References used to build
   * this module.
   */
  references: string[];
}

/**
 * Builds one structured
 * Knowledge Module from
 * a validated training.
 */
export function buildKnowledgeModule(
  training: Training,
  sources: TrainingSource[],
): KnowledgeModule {

  return {

    id: training.id,

    title: training.title,

    domain: training.domain,

    concepts: [],

    vocabulary: [],

    procedures: [],

    rules: [],

    bestPractices: [],

    examples: [],

    references: sources.map(
      source => source.title,
    ),

  };

}