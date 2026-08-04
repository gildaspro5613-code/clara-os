/**
 * ============================================
 * CLARA OS
 * Google Workspace Integration
 * --------------------------------------------
 * File : workspace.ts
 * Responsibility :
 * Provides a unified entry point
 * for Google Workspace services.
 * ============================================
 */

import { GoogleDocsIntegration } from "./docs";
import { GoogleDriveIntegration } from "./drive";

/**
 * Google Workspace.
 */
export class GoogleWorkspace {

  /**
   * Returns Google Drive integration.
   */
  public static drive(): GoogleDriveIntegration {

    return new GoogleDriveIntegration();

  }

  /**
   * Returns Google Docs integration.
   */
  public static docs(): GoogleDocsIntegration {

    return new GoogleDocsIntegration();

  }

}