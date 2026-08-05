/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : create-folders.ts
 * Responsibility :
 * Creates the default workspace folders.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";

import { ESSENTIALS_WORKSPACE_TEMPLATE } from "@/business/templates/workspace/essentials-workspace-template";

/**
 * Creates workspace folders.
 */
export class CreateFolders {

  /**
   * Creates all folders.
   */
  public async execute(
    companyFolderId: string,
  ): Promise<void> {

    const drive = GoogleWorkspace.drive();

    for (const folder of ESSENTIALS_WORKSPACE_TEMPLATE.folders) {

      await drive.createFolder(

        folder,

        companyFolderId,

      );

    }

  }

}