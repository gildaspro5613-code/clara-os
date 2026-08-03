/**
 * ============================================
 * CLARA OS
 * Knowledge Engine
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the contract implemented by every
 * Knowledge Module.
 * ============================================
 */

export interface KnowledgeModule {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Human-readable name.
   */
  name: string;

  /**
   * Module version.
   */
  version: string;

  /**
   * Module description.
   */
  description: string;

  /**
   * Fundamental principles.
   */
  principles: readonly string[];

  /**
   * Permanent objectives.
   */
  objectives: readonly string[];

  /**
   * Communication rules.
   */
  communication: readonly string[];

  /**
   * Domain vocabulary.
   */
  vocabulary: readonly string[];

}
