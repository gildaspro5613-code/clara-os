/**
 * ============================================
 * CLARA OS
 * Google Drive Connector
 * --------------------------------------------
 * File : google-drive-engine.ts
 * Responsibility :
 * Coordinates Google Drive
 * operations.
 * ============================================
 */

import { DriveClient } from "./drive-client";
import { DriveFiles } from "./drive-files";
import { DriveHealth } from "./drive-health";
import { DrivePermissions } from "./drive-permissions";
import type { GoogleDriveContext } from "./google-drive-context";
import type { GoogleDriveResult } from "./google-drive-result";

/**
 * Google Drive engine.
 */
export class GoogleDriveEngine {

  /**
   * Google Drive files service.
   */
  private readonly files: DriveFiles;

  /**
   * Google Drive permissions service.
   */
  private readonly permissions: DrivePermissions;

  /**
   * Google Drive health service.
   */
  private readonly health: DriveHealth;

  /**
   * Creates a Google Drive engine.
   */
  constructor(
    drive = new DriveClient().create(),
  ) {

    this.files =
      new DriveFiles(drive);

    this.permissions =
      new DrivePermissions(drive);

    this.health =
      new DriveHealth(drive);

  }

  /**
   * Uploads a file.
   */
  public async upload(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    await this.health.check();

    const file =
      await this.files.upload(
        context,
      );

    return {

      success: true,

      fileId: file.fileId,

      fileName: file.fileName,

      url: file.url,

      message: "File uploaded successfully.",

      completedAt: new Date(),

    };

  }

  /**
   * Downloads a file.
   */
  public async download(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    if (!context.fileId) {

      throw new Error(
        "Google Drive fileId is required for download.",
      );

    }

    await this.health.check();

    const file =
      await this.files.download(
        context.fileId,
      );

    return {

      success: true,

      fileId: file.fileId,

      fileName: file.fileName,

      url: file.url,

      message: "File downloaded successfully.",

      completedAt: new Date(),

      content: file.content,

      mimeType: file.mimeType,

    };

  }

  /**
   * Shares a file.
   */
  public async share(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    if (!context.fileId) {

      throw new Error(
        "Google Drive fileId is required for share.",
      );

    }

    await this.health.check();

    await this.permissions.share(
      context.fileId,
      context.permissions ?? [],
    );

    return {

      success: true,

      fileId: context.fileId,

      fileName: context.fileName,

      url: undefined,

      message: "File shared successfully.",

      completedAt: new Date(),

    };

  }

  /**
   * Deletes a file.
   */
  public async delete(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    if (!context.fileId) {

      throw new Error(
        "Google Drive fileId is required for delete.",
      );

    }

    await this.health.check();

    await this.files.delete(
      context.fileId,
    );

    return {

      success: true,

      fileId: context.fileId,

      fileName: context.fileName,

      url: undefined,

      message: "File deleted successfully.",

      completedAt: new Date(),

    };

  }

}
