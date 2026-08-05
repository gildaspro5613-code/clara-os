/**
 * ============================================
 * CLARA OS
 * Google Drive – Move File
 * --------------------------------------------
 * File : move-file.ts
 * Responsibility :
 * Moves a Google Drive file from one folder to
 * another via DriveClient.
 * ============================================
 */

import { DriveClient } from "./drive-client";

/**
 * Options for moving a Google Drive file.
 */
export interface MoveFileOptions {

  /**
   * Unique identifier of the file to move.
   */
  fileId: string;

  /**
   * Unique identifier of the destination folder.
   */
  destinationFolderId: string;

}

/**
 * Metadata returned after a file has been moved.
 */
export interface DriveMovedFile {

  /**
   * Unique file identifier.
   */
  id: string;

  /**
   * Display name of the file.
   */
  name: string;

  /**
   * MIME type of the file.
   */
  mimeType: string;

  /**
   * Identifiers of the parent folders.
   */
  parents: string[];

  /**
   * URL to open the file in a browser.
   */
  webViewLink?: string;

  /**
   * RFC 3339 timestamp of the last modification.
   */
  modifiedTime?: string;

}

/**
 * Moves a Google Drive file from its current parent folder(s) to a new folder.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the operation to the Drive API v3 `files.update` endpoint by
 * supplying `addParents` and `removeParents` query parameters.  The current
 * parents are fetched first so that all existing parents are removed when the
 * file is placed into the destination folder.  Errors thrown by the API are
 * propagated to the caller unchanged.
 *
 * @param options - File identifier and the destination folder identifier.
 * @returns Metadata of the moved file, including its new parent list.
 *
 * @example
 * ```ts
 * const file = await moveFile({
 *   fileId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
 *   destinationFolderId: "0B3bKMSMxVz9oYXVtZXlzSXhNVk0",
 * });
 * console.log(file.parents); // ["0B3bKMSMxVz9oYXVtZXlzSXhNVk0"]
 * ```
 */
export async function moveFile(
  options: MoveFileOptions,
): Promise<DriveMovedFile> {

  const drive = new DriveClient().create();

  const current = await drive.files.get({
    fileId: options.fileId,
    fields: "parents",
    supportsAllDrives: true,
  });

  const previousParents = (current.data.parents ?? []).join(",");

  const response = await drive.files.update({

    fileId: options.fileId,

    addParents: options.destinationFolderId,

    removeParents: previousParents,

    fields: "id,name,mimeType,parents,webViewLink,modifiedTime",

    supportsAllDrives: true,

    requestBody: {},

  });

  const f = response.data;

  if (typeof f.id !== "string" || typeof f.name !== "string") {

    throw new Error(
      `Drive API returned incomplete metadata after moving file "${options.fileId}".`,
    );

  }

  return {

    id: f.id,

    name: f.name,

    mimeType: f.mimeType ?? "",

    parents: f.parents ?? [options.destinationFolderId],

    webViewLink: f.webViewLink ?? undefined,

    modifiedTime: f.modifiedTime ?? undefined,

  };

}
