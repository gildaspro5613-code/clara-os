/**
 * ============================================
 * CLARA OS
 * Google Docs – Export PDF
 * --------------------------------------------
 * File : export-pdf.ts
 * Responsibility :
 * Exports a Google document as
 * a PDF using Google Drive.
 * ============================================
 */

import { exportGoogleDoc } from "../drive/export-google-doc";
import { assertDocumentId } from "./docs-client";

/**
 * Options for exporting a Google document as PDF.
 */
export interface ExportPdfOptions {

  /**
   * Document identifier.
   */
  documentId: string;

}

/**
 * Exports a Google document as PDF.
 *
 * Reuses the Google Drive export capability because Google Docs exports are
 * provided by the Drive API v3 `files.export` endpoint. Errors thrown by the
 * underlying export operation are propagated unchanged.
 *
 * @param options - Document identifier.
 * @returns A `Buffer` containing the generated PDF file.
 * @throws {Error} When `documentId` is empty or blank.
 */
export async function exportPdf(
  options: ExportPdfOptions,
): Promise<Buffer> {

  const documentId = assertDocumentId(options.documentId, "exportPdf");

  return exportGoogleDoc(documentId, "application/pdf");

}
