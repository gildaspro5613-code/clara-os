/**
 * ============================================
 * CLARA OS
 * Business Templates
 * --------------------------------------------
 * File : workspace-template.ts
 * Responsibility :
 * Defines one Google Workspace
 * template.
 * ============================================
 */

/**
 * Workspace template.
 */
export interface WorkspaceTemplate {

  /**
   * Template identifier.
   */
  id: string;

  /**
   * Template name.
   */
  name: string;

  /**
   * Workspace folders.
   */
  folders: string[];

}

/**
 * Default workspace template.
 */
export const WORKSPACE_TEMPLATE: WorkspaceTemplate = {

  id: "default",

  name: "Default Workspace",

  folders: [

    "Commercial",

    "Contrats",

    "Factures",

    "Documents",

    "IA",

  ],

};