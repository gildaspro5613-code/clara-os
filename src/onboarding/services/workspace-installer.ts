/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : workspace-installer.ts
 * Responsibility :
 * Creates a complete Google Workspace
 * environment for a new customer.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";

import { WorkspaceInstallationResult } from "./workspace-installation-result";

/**
 * Workspace installer.
 */
export class WorkspaceInstaller {

  /**
   * Creates the customer workspace.
   */
  public async install(
    companyName: string,
  ): Promise<WorkspaceInstallationResult> {

    const drive = GoogleWorkspace.drive();

    const companyFolderId =
      await drive.createFolder(companyName);

    const folders = [

      "Commercial",

      "Contrats",

      "Factures",

      "Documents",

      "IA",

    ];

    for (const folder of folders) {

      await drive.createFolder(
        folder,
        companyFolderId,
      );

    }

    return {

      success: true,

      companyFolderId,

      foldersCreated: folders.length,

      message:
        "Workspace installed successfully.",

      completedAt: new Date(),

    };

  }

}