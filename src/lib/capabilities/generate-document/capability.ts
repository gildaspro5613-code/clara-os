/**
 * ============================================
 * CLARA OS
 * Capability
 * --------------------------------------------
 * File : capability.ts
 * Responsibility :
 * Defines the Generate Document capability.
 * ============================================
 */

/**
 * Capability identifier.
 */
export const GENERATE_DOCUMENT_CAPABILITY = "generate-document";

/**
 * Generate Document capability.
 */
export interface GenerateDocumentCapability {

  /**
   * Unique capability identifier.
   */
  readonly id: string;

  /**
   * Human readable name.
   */
  readonly name: string;

  /**
   * Capability description.
   */
  readonly description: string;

  /**
   * Capability version.
   */
  readonly version: string;

  /**
   * Capability category.
   */
  readonly category: string;

}

/**
 * Capability definition.
 */
export const GenerateDocumentCapabilityDefinition: GenerateDocumentCapability = {

  id: GENERATE_DOCUMENT_CAPABILITY,

  name: "Generate Document",

  description:
    "Creates a complete business document from a user request.",

  version: "1.0.0",

  category: "Publishing",

};