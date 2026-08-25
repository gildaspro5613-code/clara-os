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

import {
  listFiles,
} from "@/lib/connectors/google/drive/list-files";
import {
  exportGoogleDoc,
} from "@/lib/connectors/google/drive/export-google-doc";
import {
  createFolder as createDriveFolder,
} from "@/lib/connectors/google/drive/create-folder";
import {
  moveFile,
} from "@/lib/connectors/google/drive/move-file";

import { DriveClient } from "./drive-client";
import { DriveFiles } from "./drive-files";
import { DriveFolders } from "./drive-folders";
import { DriveHealth } from "./drive-health";
import { DrivePermissions } from "./drive-permissions";
import type { GoogleDriveContext } from "./google-drive-context";
import type { GoogleDriveResult, DriveResourceEntry } from "./google-drive-result";

/** MIME type for Google Workspace document types that support text export. */
const GOOGLE_DOCS_MIME = "application/vnd.google-apps.document";
const GOOGLE_SHEETS_MIME = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDES_MIME = "application/vnd.google-apps.presentation";

const EXPORTABLE_MIME_TYPES = new Set([
  GOOGLE_DOCS_MIME,
  GOOGLE_SHEETS_MIME,
  GOOGLE_SLIDES_MIME,
]);

/**
 * Google Drive engine.
 */
export class GoogleDriveEngine {

  /**
   * Google Drive files service.
   */
  private readonly files: DriveFiles;

  /**
   * Google Drive folders service.
   */
  private readonly folders: DriveFolders;

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

    this.folders =
      new DriveFolders(drive);

    this.permissions =
      new DrivePermissions(drive);

    this.health =
      new DriveHealth(drive);

  }

  /**
   * Searches for Drive resources matching a free-text query.
   *
   * Searches both by name (contains) and optionally within a specific folder.
   * Returns all matching files and folders ordered by name.
   */
  public async search(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    const query = context.searchQuery ?? context.fileName;

    if (!query.trim()) {

      throw new Error(
        "GoogleDriveEngine.search: searchQuery or fileName is required.",
      );

    }

    await this.health.check();

    const escaped = query.replaceAll("'", "\\'");

    const driveFolderQuery =
      `name contains '${escaped}' and trashed=false`;

    const { files } = await listFiles({
      query: driveFolderQuery,
      pageSize: 20,
    });

    const entries: DriveResourceEntry[] = files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink,
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
   * Lists the contents of a Drive folder.
   */
  public async list(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    const folderId = context.folderId;

    if (!folderId) {

      throw new Error(
        "GoogleDriveEngine.list: folderId is required.",
      );

    }

    await this.health.check();

    const query = `'${folderId}' in parents and trashed=false`;

    const { files } = await listFiles({
      query,
      pageSize: 100,
    });

    const entries: DriveResourceEntry[] = files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink,
    }));

    return {
      success: true,
      fileId: folderId,
      fileName: context.fileName,
      entries,
      message: `Listed ${entries.length} item(s) in folder.`,
      completedAt: new Date(),
    };

  }

  /**
   * Reads the plain-text content of a Google Workspace document.
   * For non-exportable MIME types, returns an empty text content with a message.
   */
  public async readContent(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    if (!context.fileId) {

      throw new Error(
        "GoogleDriveEngine.readContent: fileId is required.",
      );

    }

    await this.health.check();

    const mimeType = context.mimeType;

    if (mimeType && !EXPORTABLE_MIME_TYPES.has(mimeType)) {

      return {
        success: true,
        fileId: context.fileId,
        fileName: context.fileName,
        mimeType,
        textContent: "",
        message: `File type "${mimeType}" cannot be read as plain text.`,
        completedAt: new Date(),
      };

    }

    const buffer = await exportGoogleDoc(
      context.fileId,
      "text/plain",
    );

    return {
      success: true,
      fileId: context.fileId,
      fileName: context.fileName,
      mimeType: context.mimeType,
      textContent: buffer.toString("utf-8"),
      message: "File content read successfully.",
      completedAt: new Date(),
    };

  }

  /**
   * Moves a file to another folder.
   */
  public async move(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    if (!context.fileId) {

      throw new Error(
        "GoogleDriveEngine.move: fileId is required.",
      );

    }

    if (!context.destinationFolderId) {

      throw new Error(
        "GoogleDriveEngine.move: destinationFolderId is required.",
      );

    }

    await this.health.check();

    const moved = await moveFile({
      fileId: context.fileId,
      destinationFolderId: context.destinationFolderId,
    });

    return {
      success: true,
      fileId: moved.id,
      fileName: moved.name,
      url: moved.webViewLink,
      mimeType: moved.mimeType,
      message: "File moved successfully.",
      completedAt: new Date(),
    };

  }

  /**
   * Creates a folder in Drive.
   */
  public async createFolder(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult> {

    await this.health.check();

    const folder = await createDriveFolder({
      name: context.fileName,
      parentId: context.folderId,
    });

    return {
      success: true,
      fileId: folder.id,
      fileName: folder.name,
      url: folder.webViewLink,
      mimeType: folder.mimeType,
      message: "Folder created successfully.",
      completedAt: new Date(),
    };

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
