/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : create-company-folder.ts
 * Responsibility :
 * Creates the company folder.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";

/**
 * Creates the company folder.
 */
export class CreateCompanyFolder {

  /**
   * Creates one company folder.
   */
  public async execute(
    companyName: string,
  ): Promise<string> {

    const drive = GoogleWorkspace.drive();

    return drive.createFolder(companyName);

  }

}