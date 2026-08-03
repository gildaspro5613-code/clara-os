/**
 * ============================================
 * CLARA OS
 * Academy Module
 * --------------------------------------------
 * File : academy-engine.ts
 * Responsibility :
 * Orchestrates Clara's complete
 * learning pipeline.
 * ============================================
 */

import { Training } from "./training";
import { TrainingSource } from "./training-source";
import {
  KnowledgeModule,
  buildKnowledgeModule,
} from "./knowledge-builder";

/**
 * Executes one complete
 * Academy learning cycle.
 */
export function runAcademy(

  training: Training,

  sources: TrainingSource[],

): KnowledgeModule {

  /*
   * Future steps:
   *
   * - Brain document analysis
   * - Knowledge extraction
   * - Human validation
   * - Competency update
   */

  return buildKnowledgeModule(
    training,
    sources,
  );

}