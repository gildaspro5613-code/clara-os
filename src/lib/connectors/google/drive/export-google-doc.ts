/**
 * ============================================
 * CLARA OS
 * Google Drive – Export Google Doc
 * --------------------------------------------
 * File : export-google-doc.ts
 * Responsibility :
 * Exports a Google Workspace document
 * (Docs, Sheets, Slides, etc.) to a
 * specified MIME type via DriveClient.
 * ============================================
 */

import { DriveClient } from "./drive-client";

/**
 * The set of MIME types supported when exporting a Google Workspace document.
 */
export type ExportMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

/**
 * Exports a Google Workspace document (e.g. Google Doc, Sheet, or Slide) to
 * the requested MIME type and returns its content as a {@link Buffer}.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the export to the Drive API v3 `files.export` endpoint.
 * The response is collected into a single `Buffer` so callers receive a
 * self-contained, in-memory representation of the exported file. Errors
 * thrown by the API are propagated to the caller unchanged.
 *
 * @param fileId   - The unique identifier of the Google Workspace file to export.
 * @param mimeType - The target MIME type for the exported document.
 * @returns A `Buffer` containing the exported file content.
 * @throws {Error} When `fileId` is empty or blank.
 *
 * @example
 * ```ts
 * import { writeFileSync } from "fs";
 *
 * const buffer = await exportGoogleDoc(
 *   "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
 *   "application/pdf",
 * );
 * writeFileSync("/tmp/document.pdf", buffer);
 * ```
 */
export async function exportGoogleDoc(
  fileId: string,
  mimeType: ExportMimeType,
): Promise<Buffer> {

  if (!fileId.trim()) {

    throw new Error("exportGoogleDoc: fileId must not be empty.");

  }

  const drive = await new DriveClient().create();

  const response = await drive.files.export(
    { fileId, mimeType },
    { responseType: "arraybuffer" },
  );

  return Buffer.from(response.data as ArrayBuffer);

}
