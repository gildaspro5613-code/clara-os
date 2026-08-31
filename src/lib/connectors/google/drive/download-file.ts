/**
 * ============================================
 * CLARA OS
 * Google Drive – Download File
 * --------------------------------------------
 * File : download-file.ts
 * Responsibility :
 * Downloads the binary content of a
 * Google Drive file via DriveClient.
 * ============================================
 */

import type { Readable } from "stream";

import { DriveClient } from "./drive-client";

/**
 * Options for downloading a file from Google Drive.
 */
export interface DownloadFileOptions {

  /**
   * The unique identifier of the Drive file to download.
   */
  fileId: string;

  /**
   * Must be `"media"` to request the raw file content.
   * Defaults to `"media"` when omitted.
   */
  alt?: "media";

}

/**
 * Downloads the binary content of a Google Drive file.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the retrieval to the Drive API v3 `files.get` endpoint with
 * `alt=media`. The response body is returned as a Node.js {@link Readable}
 * stream so that callers can pipe large files without buffering them entirely
 * in memory. Errors thrown by the API are propagated to the caller unchanged.
 *
 * @param options - Options containing the `fileId` and optional `alt` field.
 * @returns A readable stream of the file's binary content.
 * @throws {Error} When `fileId` is empty or blank.
 *
 * @example
 * ```ts
 * import { createWriteStream } from "fs";
 * import { pipeline } from "stream/promises";
 *
 * const stream = await downloadFile({ fileId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" });
 * await pipeline(stream, createWriteStream("/tmp/output.bin"));
 * ```
 */
export async function downloadFile(
  options: DownloadFileOptions,
): Promise<Readable> {

  const { fileId, alt = "media" } = options;

  if (!fileId.trim()) {

    throw new Error("downloadFile: fileId must not be empty.");

  }

  const drive = await new DriveClient().create();

  const response = await drive.files.get(
    {
      fileId,
      alt,
      supportsAllDrives: true,
    },
    { responseType: "stream" },
  );

  return response.data as Readable;

}
