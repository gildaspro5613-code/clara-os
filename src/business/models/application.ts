/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : application.ts
 * Responsibility :
 * Defines one Clara application.
 * ============================================
 */

import { Offer } from "./offer";
import { Branding } from "./branding";
import { WorkspaceTemplate } from "../templates/workspace-template";

/**
 * Clara application.
 */
export interface Application {

  /**
   * Identifier.
   */
  id: string;

  /**
   * Display name.
   */
  name: string;

  /**
   * Description.
   */
  description: string;

  /**
   * Commercial offer.
   */
  offer: Offer;

  /**
   * Branding.
   */
  branding: Branding;

  /**
   * Workspace template.
   */
  workspace: WorkspaceTemplate;

  /**
   * Enabled connectors.
   */
  connectors: string[];

  /**
   * Enabled capabilities.
   */
  capabilities: string[];

}