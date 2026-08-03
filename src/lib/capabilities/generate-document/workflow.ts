/**
 * ============================================
 * CLARA OS
 * Generate Document Capability
 * --------------------------------------------
 * File : workflow.ts
 * Responsibility :
 * Describes the execution workflow
 * of the Generate Document capability.
 * ============================================
 */

/**
 * Workflow step.
 */
export interface WorkflowStep {

  /**
   * Step identifier.
   */
  readonly id: string;

  /**
   * Human readable name.
   */
  readonly name: string;

  /**
   * Capability executed.
   */
  readonly capability: string;

}

/**
 * Generate Document workflow.
 */
export const GENERATE_DOCUMENT_WORKFLOW: WorkflowStep[] = [

  {

    id: "draft",

    name: "Generate draft",

    capability: "generate-text",

  },

  {

    id: "publish",

    name: "Create business document",

    capability: "publish-document",

  },

  {

    id: "archive",

    name: "Store document",

    capability: "store-file",

  },

];