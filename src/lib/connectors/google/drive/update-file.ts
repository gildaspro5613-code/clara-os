/**
 * ============================================
 * CLARA OS
 * Google Drive – Update File
 * --------------------------------------------
 * File : update-file.ts
 * Responsibility :
 * Updates the metadata and/or content of an
 * existing Google Drive file via DriveClient.
 * ============================================
 */

import type { Readable } from "stream";

import { DriveClient } from "./drive-client";

/**
 * Options for updating an existing Google Drive file.
 */
export interface UpdateFileOptions {

  /**
   * Unique identifier of the file to update.
   */
  fileId: string;

  /**
   * New display name for the file.
   * When omitted the existing name is kept.
   */
  name?: string;

  /**
   * New MIME type for the file.
   * When omitted the existing MIME type is kept.
   */
  mimeType?: string;

  /**
   * New file content as a readable stream or a buffer.
   * When omitted only the metadata is updated.
   */
  content?: Readable | Buffer;

}

/**
 * Metadata returned after a file has been updated.
 */
export interface DriveUpdatedFile {

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
   * URL to open the file in a browser.
   */
  webViewLink?: string;

  /**
   * RFC 3339 timestamp of the last modification.
   */
  modifiedTime?: string;

  /**
   * File size in bytes.
   */
  size?: string;

}

/**
 * Updates the metadata and/or content of an existing Google Drive file.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the update to the Drive API v3 `files.update` endpoint.
 * When {@link UpdateFileOptions.content} is provided a media upload is
 * performed alongside the metadata patch; otherwise only metadata fields
 * are updated. Errors thrown by the API are propagated to the caller
 * unchanged.
 *
 * @param options - File identifier, optional new name, MIME type, and content.
 * @returns Metadata of the updated file.
 *
 * @example
 * ```ts
 * import { createReadStream } from "fs";
 *
 * const file = await updateFile({
 *   fileId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
 *   name: "report-v2.pdf",
 *   mimeType: "application/pdf",
 *   content: createReadStream("/tmp/report-v2.pdf"),
 * });
 * console.log(file.modifiedTime);
 * ```
 */
export async function updateFile(
  options: UpdateFileOptions,
): Promise<DriveUpdatedFile> {

  const drive = await new DriveClient().create();

  const response = await drive.files.update({

    fileId: options.fileId,

    fields: "id,name,mimeType,webViewLink,modifiedTime,size",

    supportsAllDrives: true,

    requestBody: {

      ...(options.name !== undefined && { name: options.name }),

      ...(options.mimeType !== undefined && { mimeType: options.mimeType }),

    },

    ...(options.content !== undefined && {
      media: {
        mimeType: options.mimeType,
        body: options.content,
      },
    }),

  });

  const f = response.data;

  if (typeof f.id !== "string" || typeof f.name !== "string") {

    throw new Error(
      `Drive API returned incomplete metadata after updating file "${options.fileId}".`,
    );

  }

  return {

    id: f.id,

    name: f.name,

    mimeType: f.mimeType ?? options.mimeType ?? "",

    webViewLink: f.webViewLink ?? undefined,

    modifiedTime: f.modifiedTime ?? undefined,

    size: f.size ?? undefined,

  };

}
