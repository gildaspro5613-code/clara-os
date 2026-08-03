/**
 * ============================================
 * CLARA OS
 * Templates Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Templates module.
 * ============================================
 */

import { TemplateEngine } from "./core/template-engine";

/**
 * Templates module.
 */
export const TEMPLATES_MODULE = {

  /**
   * Module identity.
   */
  id: "templates",

  name: "Templates",

  version: "1.0.0",

  description:
    "Provides reusable publication templates for Clara OS.",

  /**
   * Template engine.
   */
  engine: new TemplateEngine(),

} as const;