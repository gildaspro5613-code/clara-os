/**
 * ============================================
 * CLARA OS
 * Google Docs – Insert Table
 * --------------------------------------------
 * File : insert-table.ts
 * Responsibility :
 * Inserts a table into a
 * Google document.
 * ============================================
 */

import type { docs_v1 } from "googleapis";

import {
  assertDocumentId,
  assertPositiveInteger,
  type DocumentInsertionTarget,
  resolveInsertionTarget,
} from "./docs-client";
import { updateDocument } from "./update-document";

/**
 * Options for inserting a table into a Google document.
 */
export interface InsertTableOptions extends DocumentInsertionTarget {

  /**
   * Document identifier.
   */
  documentId: string;

  /**
   * Number of rows to create.
   */
  rows: number;

  /**
   * Number of columns to create.
   */
  columns: number;

  /**
   * Optional write coordination options.
   */
  writeControl?: docs_v1.Schema$WriteControl;

}

/**
 * Inserts a table into a Google document.
 *
 * Uses {@link updateDocument} to execute a Docs API v1 `InsertTableRequest`.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Document identifier, target location, and table dimensions.
 * @returns The Google Docs batch update response.
 * @throws {Error} When `documentId` is empty or `rows` / `columns` are invalid.
 */
export async function insertTable(
  options: InsertTableOptions,
): Promise<docs_v1.Schema$BatchUpdateDocumentResponse> {

  const documentId = assertDocumentId(options.documentId, "insertTable");

  assertPositiveInteger(options.rows, "rows", "insertTable");
  assertPositiveInteger(options.columns, "columns", "insertTable");

  return updateDocument({

    documentId,

    requests: [
      {
        insertTable: {
          rows: options.rows,
          columns: options.columns,
          ...resolveInsertionTarget(options, "insertTable"),
        },
      },
    ],

    writeControl: options.writeControl,

  });

}
