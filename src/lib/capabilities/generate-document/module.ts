/**
 * ============================================
 * CLARA OS
 * Generate Document Capability
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Registers the Generate Document
 * capability module.
 * ============================================
 */

import {
  GenerateDocumentCapabilityDefinition,
} from "./capability";

import {
  GENERATE_DOCUMENT_WORKFLOW,
} from "./workflow";

/**
 * Generate Document module.
 */
export const GENERATE_DOCUMENT_MODULE = {

  /**
   * Capability definition.
   */
  capability: GenerateDocumentCapabilityDefinition,

  /**
   * Capability workflow.
   */
  workflow: GENERATE_DOCUMENT_WORKFLOW,

};