/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : create-sheets.ts
 * Responsibility :
 * Creates Google Sheets
 * for a workspace.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";
import type { WorkspaceSpreadsheet } from "../../models/workspace-spreadsheet";

/**
 * Creates workspace spreadsheets.
 */
export class CreateSheets {

  /**
   * Creates the default spreadsheets.
   */
  public async execute(
    companyName: string,
  ): Promise<WorkspaceSpreadsheet[]> {

    const sheets =
      GoogleWorkspace.sheets();

    const spreadsheets: WorkspaceSpreadsheet[] = [

      {
        role: "crm",
        title: `${companyName} - CRM`,
        spreadsheetId: "",
      },

      {
        role: "prospects",
        title: `${companyName} - Prospects`,
        spreadsheetId: "",
      },

      {
        role: "clients",
        title: `${companyName} - Clients`,
        spreadsheetId: "",
      },

      {
        role: "production",
        title: `${companyName} - Production`,
        spreadsheetId: "",
      },

    ];

    for (const spreadsheet of spreadsheets) {

      spreadsheet.spreadsheetId =
        await sheets.createSpreadsheet(
          spreadsheet.title,
        );

    }

    return spreadsheets;

  }

}