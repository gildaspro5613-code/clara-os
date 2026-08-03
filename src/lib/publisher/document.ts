/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : document.ts
 * Responsibility :
 * Defines one generated document.
 * ============================================
 */

import { Publication } from "./publication";

/**
 * Generated document.
 */
export interface Document {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Associated publication.
   */
  publication: Publication;

  /**
   * Document title.
   */
  title: string;

  /**
   * Structured content.
   */
  content: string;

  /**
   * Document version.
   */
  version: string;

  /**
   * Creation date.
   */
  createdAt: Date;

}