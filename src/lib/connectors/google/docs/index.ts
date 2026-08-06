/**
 * ============================================
 * CLARA OS
 * Google Docs
 * --------------------------------------------
 * File : index.ts
 * Responsibility :
 * Public exports for Google Docs
 * connector client and operations.
 * ============================================
 */

/**
 * Google Docs connector public API exports.
 */
export { DocsClient } from "./docs-client";
export type {
  DocumentDimensionUnit,
  DocumentInsertionTarget,
} from "./docs-client";
export type {
  CreateDocumentOptions,
  CreateDocumentResult,
} from "./create-document";
export { createDocument } from "./create-document";
export type { GetDocumentOptions } from "./get-document";
export { getDocument } from "./get-document";
export type { UpdateDocumentOptions } from "./update-document";
export { updateDocument } from "./update-document";
export type {
  ReplaceTextOptions,
  ReplaceTextResult,
} from "./replace-text";
export { replaceText } from "./replace-text";
export type { InsertTextOptions } from "./insert-text";
export { insertText } from "./insert-text";
export type { InsertTableOptions } from "./insert-table";
export { insertTable } from "./insert-table";
export type {
  InsertImageOptions,
  InsertImageResult,
} from "./insert-image";
export { insertImage } from "./insert-image";
export type { ExportPdfOptions } from "./export-pdf";
export { exportPdf } from "./export-pdf";
