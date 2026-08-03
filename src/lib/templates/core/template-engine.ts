/**
 * ============================================
 * CLARA OS
 * Templates Module
 * --------------------------------------------
 * File : template-engine.ts
 * Responsibility :
 * Resolves publication templates.
 * ============================================
 */

import { PublicationTemplate } from "./publication-template";

/**
 * Template engine.
 */
export class TemplateEngine {

  /**
   * Selects the appropriate template.
   */
  public resolveTemplate(
    templates: PublicationTemplate[],
    category: string,
  ): PublicationTemplate | undefined {

    return templates.find(
      (template) => template.category === category,
    );

  }

}