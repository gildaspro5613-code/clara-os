/**
 * ============================================
 * CLARA OS
 * Organize Drive Capability
 * --------------------------------------------
 * Workflow :
 * ensure target folder → move file.
 * ============================================
 */

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";

import {
  getWorkspaceFolder,
} from "@/lib/core/workspace/workspace-resolver";

import type { OrganizeDriveContext } from "./context";
import type { OrganizeDriveResult } from "./result";

export class OrganizeDriveWorkflow {
  private readonly drive =
    new GoogleDriveEngine();

  public async execute(
    context: OrganizeDriveContext,
  ): Promise<OrganizeDriveResult> {
    if (!context.fileId.trim()) {
      return {
        success: false,
        fileId: context.fileId,
        folderName: context.folderName,
        message: "Google Drive fileId is required.",
        completedAt: new Date(),
      };
    }

    if (!context.folderName.trim()) {
      return {
        success: false,
        fileId: context.fileId,
        folderName: context.folderName,
        message: "Target folder name is required.",
        completedAt: new Date(),
      };
    }

    try {
      const workspaceFolder =
        await getWorkspaceFolder(
          context.folderName.trim(),
        );

      const folder =
        workspaceFolder
          ? {
              id: workspaceFolder.folderId,
              name: workspaceFolder.name,
            }
          : await this.drive.ensureFolder(
              context.folderName.trim(),
              context.parentFolderId,
            );

      const moved =
        await this.drive.move({
          fileId: context.fileId,
          destinationFolderId: folder.id,
        });

      return {
        success: true,
        fileId: moved.fileId,
        folderId: folder.id,
        folderName: folder.name,
        message:
          `File organized successfully in "${folder.name}".`,
        completedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        fileId: context.fileId,
        folderName: context.folderName,
        message:
          error instanceof Error
            ? error.message
            : "Unable to organize the Google Drive file.",
        completedAt: new Date(),
      };
    }
  }
}
