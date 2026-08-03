/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : publication.ts
 * Responsibility :
 * Defines one publication request.
 * ============================================
 */

import { Template } from "./template";

/**
 * Publication request.
 */
export interface Publication {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Publication title.
   */
  title: string;

  /**
   * Publication objective.
   */
  objective: string;

  /**
   * Selected template.
   */
  template: Template;

  /**
   * Target audience.
   */
  audience: string;

  /**
   * Requested language.
   */
  language: string;

  /**
   * Creation date.
   */
  createdAt: Date;

}