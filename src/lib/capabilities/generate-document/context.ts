/**
 * ============================================
 * CLARA OS
 * Generate Document Capability
 * --------------------------------------------
 * File : context.ts
 * Responsibility :
 * Defines every input required to
 * generate a business document.
 * ============================================
 */

/**
 * Generate Document context.
 */
export interface GenerateDocumentContext {

  /**
   * Document title.
   */
  readonly title: string;

  /**
   * Business objective.
   */
  readonly objective: string;

  /**
   * Target audience.
   */
  readonly audience: string;

  /**
   * Document language.
   */
  readonly language: string;

  /**
   * Writing tone.
   */
  readonly tone: string;

  /**
   * Template identifier.
   */
  readonly template?: string;

  /**
   * Optional business data.
   */
  readonly data?: Record<string, unknown>;

}