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
import type { WorkspaceFolder } from "../../models/workspace-folder";

/**
 * Creates workspace folders.
 */
export class CreateFolders {

  /**
   * Creates all folders.
   */
  public async execute(
    companyFolderId: string,
  ): Promise<WorkspaceFolder[]> {

    const drive = GoogleWorkspace.drive();

    const folders: WorkspaceFolder[] = [];

    for (const folder of ESSENTIALS_WORKSPACE_TEMPLATE.folders) {

      const folderId =
        await drive.createFolder(

          folder,

          companyFolderId,

        );

      folders.push({

        name: folder,

        folderId,

      });

    }

    return folders;

  }

}