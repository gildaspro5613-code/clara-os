/**
 * ============================================
 * CLARA OS
 * Google Docs – Insert Text
 * --------------------------------------------
 * File : insert-text.ts
 * Responsibility :
 * Inserts text into a Google
 * document at a target location.
 * ============================================
 */

import type { docs_v1 } from "googleapis";

import {
  assertDocumentId,
  assertNonEmptyString,
  type DocumentInsertionTarget,
  resolveInsertionTarget,
} from "./docs-client";
import { updateDocument } from "./update-document";

/**
 * Options for inserting text into a Google document.
 */
export interface InsertTextOptions extends DocumentInsertionTarget {

  /**
   * Document identifier.
   */
  documentId: string;

  /**
   * Text to insert.
   */
  text: string;

  /**
   * Optional write coordination options.
   */
  writeControl?: docs_v1.Schema$WriteControl;

}

/**
 * Inserts text into a Google document.
 *
 * Uses {@link updateDocument} to execute a Docs API v1 `InsertTextRequest`.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Document identifier, target location, and text.
 * @returns The Google Docs batch update response.
 * @throws {Error} When `documentId` or `text` is empty.
 */
export async function insertText(
  options: InsertTextOptions,
): Promise<docs_v1.Schema$BatchUpdateDocumentResponse> {

  const documentId = assertDocumentId(options.documentId, "insertText");
  const text = assertNonEmptyString(options.text, "text", "insertText");

  return updateDocument({

    documentId,

    requests: [
      {
        insertText: {
          text,
          ...resolveInsertionTarget(options, "insertText"),
        },
      },
    ],

    writeControl: options.writeControl,

  });

}
