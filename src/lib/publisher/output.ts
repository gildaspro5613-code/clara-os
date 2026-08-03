/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : output.ts
 * Responsibility :
 * Defines one publication output.
 * ============================================
 */

import { Document } from "./document";

/**
 * Publication output.
 */
export interface Output {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Source document.
   */
  document: Document;

  /**
   * Output format.
   */
  format:

    | "pdf"

    | "docx"

    | "html"

    | "markdown"

    | "email"

    | "json";

  /**
   * Output location.
   */
  location: string;

  /**
   * Generation date.
   */
  generatedAt: Date;

}