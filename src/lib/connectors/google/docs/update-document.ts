/**
 * ============================================
 * CLARA OS
 * Google Docs – Update Document
 * --------------------------------------------
 * File : update-document.ts
 * Responsibility :
 * Executes Google Docs batch
 * update requests using DocsClient.
 * ============================================
 */

import type { docs_v1 } from "googleapis";

import { assertDocumentId, normalizeWriteControl, DocsClient } from "./docs-client";

/**
 * Options for executing a Google Docs batch update.
 */
export interface UpdateDocumentOptions {

  /**
   * Document identifier.
   */
  documentId: string;

  /**
   * One or more Google Docs requests to execute atomically.
   */
  requests: docs_v1.Schema$Request[];

  /**
   * Optional write coordination options.
   */
  writeControl?: docs_v1.Schema$WriteControl;

}

/**
 * Executes a Google Docs batch update.
 *
 * Uses {@link DocsClient} to obtain an authenticated Google Docs client and
 * delegates to the Docs API v1 `documents.batchUpdate` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Document identifier and batch update requests.
 * @returns The Google Docs batch update response.
 * @throws {Error} When `documentId` is empty or `requests` is empty.
 */
export async function updateDocument(
  options: UpdateDocumentOptions,
): Promise<docs_v1.Schema$BatchUpdateDocumentResponse> {

  const documentId = assertDocumentId(options.documentId, "updateDocument");

  if (options.requests.length === 0) {

    throw new Error("updateDocument: requests must contain at least one entry.");

  }

  const docs = await new DocsClient().create();

  const response = await docs.documents.batchUpdate({

    documentId,

    requestBody: {

      requests: options.requests,

      writeControl: normalizeWriteControl(options.writeControl, "updateDocument"),

    },

  });

  return response.data;

}
