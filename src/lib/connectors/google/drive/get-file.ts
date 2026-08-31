/**
 * ============================================
 * CLARA OS
 * Google Drive – Get File
 * --------------------------------------------
 * File : get-file.ts
 * Responsibility :
 * Retrieves the metadata of a single
 * Google Drive file by its fileId.
 * ============================================
 */

import { DriveClient } from "./drive-client";

/**
 * Metadata for a single Google Drive file.
 */
export interface DriveFileDetail {

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
  mimeType?: string;

  /**
   * URL to open the file in a browser.
   */
  webViewLink?: string;

  /**
   * RFC 3339 timestamp of the last modification.
   */
  modifiedTime?: string;

  /**
   * RFC 3339 timestamp of creation.
   */
  createdTime?: string;

  /**
   * File size in bytes (not set for Google Workspace documents).
   */
  size?: string;

}

/**
 * Retrieves the metadata of a Google Drive file by its identifier.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the lookup to the Drive API v3 `files.get` endpoint.
 * Errors thrown by the API are propagated to the caller unchanged.
 *
 * @param fileId - The unique identifier of the Drive file.
 * @returns The file metadata.
 *
 * @example
 * ```ts
 * const file = await getFile("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms");
 * console.log(file.name);
 * ```
 */
export async function getFile(fileId: string): Promise<DriveFileDetail> {

  const drive = await new DriveClient().create();

  const response = await drive.files.get({

    fileId,

    fields: "id,name,mimeType,webViewLink,modifiedTime,createdTime,size",

    supportsAllDrives: true,

  });

  const f = response.data;

  if (typeof f.id !== "string" || typeof f.name !== "string") {

    throw new Error(
      `Drive API returned incomplete metadata for file "${fileId}".`,
    );

  }

  return {

    id: f.id,

    name: f.name,

    mimeType: f.mimeType ?? undefined,

    webViewLink: f.webViewLink ?? undefined,

    modifiedTime: f.modifiedTime ?? undefined,

    createdTime: f.createdTime ?? undefined,

    size: f.size ?? undefined,

  };

}
