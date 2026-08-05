/**
 * ============================================
 * CLARA OS
 * Google Workspace Integration
 * --------------------------------------------
 * File : workspace.ts
 * Responsibility :
 * Unified entry point for
 * every Google Workspace service.
 * ============================================
 */

import { GoogleCalendarIntegration } from "./calendar";
import { GoogleDocsIntegration } from "./docs";
import { GoogleDriveIntegration } from "./drive";
import { GoogleGmailIntegration } from "./gmail";
import { GoogleSheetsIntegration } from "./sheets";

/**
 * Google Workspace.
 */
export class GoogleWorkspace {

  /**
   * Google Drive.
   */
  public static drive(): GoogleDriveIntegration {

    return new GoogleDriveIntegration();

  }

  /**
   * Google Docs.
   */
  public static docs(): GoogleDocsIntegration {

    return new GoogleDocsIntegration();

  }

  /**
   * Google Sheets.
   */
  public static sheets(): GoogleSheetsIntegration {

    return new GoogleSheetsIntegration();

  }

  /**
   * Google Calendar.
   */
  public static calendar(): GoogleCalendarIntegration {

    return new GoogleCalendarIntegration();

  }

  /**
   * Gmail.
   */
  public static gmail(): GoogleGmailIntegration {

    return new GoogleGmailIntegration();

  }

}