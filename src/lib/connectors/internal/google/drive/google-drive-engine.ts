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
import { DriveFolders } from "./drive-folders";
import { DrivePermissions } from "./drive-permissions";
import type {
  GoogleDriveContext,
} from "./google-drive-context";

import type {
  DriveFileListOptions,
  DriveFileListResult,
} from "./drive-files";
import type {
  GoogleDriveResult,
  DriveResourceEntry,
} from "./google-drive-result";
import type { drive_v3 } from "googleapis";

/**
 * Google Drive engine.
 */
export class GoogleDriveEngine {

  /**
   * Google Drive files service.
   */
  private readonly services: Promise<{
    files: DriveFiles;
    permissions: DrivePermissions;
    health: DriveHealth;
    folders: DriveFolders;
  }>;

  /**
   * Creates a Google Drive engine.
   */
  constructor(
    drive?: drive_v3.Drive,
  ) {
    this.services = (drive
      ? Promise.resolve(drive)
      : new DriveClient().create()
    ).then((client) => ({
      files: new DriveFiles(client),
      permissions: new DrivePermissions(client),
      health: new DriveHealth(client),
      folders: new DriveFolders(client),
    }));
  }

  /**
   * Lists files stored in Google Drive.
   */
  public async list(
    options: DriveFileListOptions = {},
  ): Promise<DriveFileListResult> {
    const { health, files } = await this.services;
    await health.check();

    const result = await files.list(options);

    return {
      ...result,
      entries: result.files.map((file) => ({
        id: file.fileId,
        name: file.fileName,
        mimeType: file.mimeType,
        webViewLink: file.url,
        parents: file.parents,
      })),
    };
  }

  /**
   * Searches Google Drive resources by name.
   */
  public async search(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    const query = (
      context.searchQuery ??
      context.fileName
    ).trim();

    if (!query) {
      throw new Error(
        "GoogleDriveEngine.search: searchQuery or fileName is required.",
      );
    }

    const { health, files } = await this.services;
    await health.check();

    const escaped = query.replaceAll("'", "\\'");

    const result = await files.list({
      pageSize: 100,
      query: `name contains '${escaped}' and trashed=false`,
    });

    const entries: DriveResourceEntry[] =
      result.files.map((file) => ({
        id: file.fileId,
        name: file.fileName,
        mimeType: file.mimeType,
        webViewLink: file.url,
        parents: file.parents,
      }));

    const primary = entries[0];

    return {
      success: true,
      fileId: primary?.id ?? "",
      fileName: primary?.name ?? "",
      url: primary?.webViewLink,
      mimeType: primary?.mimeType,
      entries,
      message:
        entries.length === 0
          ? `No Drive resource found matching "${query}".`
          : `Found ${entries.length} resource(s) matching "${query}".`,
      completedAt: new Date(),
    };
  }

  /**
   * Reads plain-text content from a Google Workspace document.
   */
  public async readContent(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    if (!context.fileId) {
      throw new Error(
        "Google Drive fileId is required for readContent.",
      );
    }

    const { health, files } = await this.services;
    await health.check();

    const file =
      await files.readContent(
        context.fileId,
        context.mimeType,
      );

    return {
      success: true,
      fileId: context.fileId,
      fileName: context.fileName,
      content: undefined,
      mimeType: file.mimeType,
      textContent: file.textContent,
      message: "File content read successfully.",
      completedAt: new Date(),
    };
  }

  /**
   * Ensures a Google Drive folder exists.
   */
  public async ensureFolder(
    name: string,
    parentId?: string,
  ) {
    const { health, folders } = await this.services;
    await health.check();

    return folders.ensure(
      name,
      parentId,
    );
  }

  /**
   * Moves a file into a Google Drive folder.
   */
  public async move(
    context: {
      fileId: string;
      destinationFolderId: string;
    },
  ): Promise<GoogleDriveResult> {
    if (!context.fileId) {
      throw new Error(
        "Google Drive fileId is required for move.",
      );
    }

    if (!context.destinationFolderId) {
      throw new Error(
        "Google Drive destinationFolderId is required for move.",
      );
    }

    const { health } = await this.services;
    await health.check();

    const drive =
      await new DriveClient().create();

    const metadata =
      await drive.files.get({
        fileId: context.fileId,
        fields: "parents",
        supportsAllDrives: true,
      });

    const parents =
      (metadata.data.parents ?? []).join(",");

    const response =
      await drive.files.update({
        fileId: context.fileId,
        addParents: context.destinationFolderId,
        removeParents: parents,
        fields:
          "id,name,mimeType,webViewLink",
        supportsAllDrives: true,
        requestBody: {},
      });

    const file = response.data;

    if (!file.id || !file.name) {
      throw new Error(
        "Google Drive did not return the moved file.",
      );
    }

    return {
      success: true,
      fileId: file.id,
      fileName: file.name,
      url: file.webViewLink ?? undefined,
      message: "File moved successfully.",
      completedAt: new Date(),
    };
  }

  /**
   * Uploads a file.
   */
  public async upload(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    const { health, files } = await this.services;
    await health.check();

    const file =
      await files.upload(
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

    const { health, files } = await this.services;
    await health.check();

    const file =
      await files.download(
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

    const { health, permissions } = await this.services;
    await health.check();

    await permissions.share(
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

    const { health, files } = await this.services;
    await health.check();

    await files.delete(
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
