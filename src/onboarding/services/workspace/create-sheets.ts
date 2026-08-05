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

/**
 * Creates workspace spreadsheets.
 */
export class CreateSheets {

  /**
   * Creates the default spreadsheets.
   */
  public async execute(
    companyName: string,
  ): Promise<string[]> {

    const sheets =
      GoogleWorkspace.sheets();

    const spreadsheetIds: string[] = [];

    const documents = [

      `${companyName} - CRM`,

      `${companyName} - Prospects`,

      `${companyName} - Clients`,

      `${companyName} - Production`,

    ];

    for (const title of documents) {

      const id =
        await sheets.createSpreadsheet(
          title,
        );

      spreadsheetIds.push(id);

    }

    return spreadsheetIds;

  }

}