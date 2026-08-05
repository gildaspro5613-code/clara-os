/**
 * ============================================
 * CLARA OS
 * Google Drive – Delete File
 * --------------------------------------------
 * File : delete-file.ts
 * Responsibility :
 * Deletes a Google Drive file
 * via DriveClient.
 * ============================================
 */

import { DriveClient } from "./drive-client";

/**
 * Options for deleting a file from Google Drive.
 */
export interface DeleteFileOptions {

  /**
   * Unique identifier of the Drive file to delete.
   */
  fileId: string;

}

/**
 * Deletes a Google Drive file by its identifier.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the deletion to the Drive API v3 `files.delete` endpoint.
 * Errors thrown by the Google API are propagated to the caller unchanged.
 *
 * @param options - Options containing the `fileId` of the file to delete.
 * @returns Resolves when the deletion succeeds.
 * @throws {Error} When `fileId` is empty or blank.
 *
 * @example
 * ```ts
 * await deleteFile({
 *   fileId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
 * });
 * ```
 */
export async function deleteFile(
  options: DeleteFileOptions,
): Promise<void> {

  const { fileId } = options;

  if (!fileId.trim()) {

    throw new Error("deleteFile: fileId must not be empty.");

  }

  const drive = new DriveClient().create();

  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });

}
