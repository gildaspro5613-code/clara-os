/**
 * ============================================
 * CLARA OS
 * Google Docs – Get Document
 * --------------------------------------------
 * File : get-document.ts
 * Responsibility :
 * Retrieves Google document metadata
 * and content using DocsClient.
 * ============================================
 */

import type { docs_v1 } from "googleapis";

import { assertDocumentId, assertNonEmptyString, DocsClient } from "./docs-client";

/**
 * Options for retrieving a Google document.
 */
export interface GetDocumentOptions {

  /**
   * Document identifier.
   */
  documentId: string;

  /**
   * Whether to populate multi-tab content in `document.tabs`.
   */
  includeTabsContent?: boolean;

  /**
   * Suggestion rendering mode accepted by the Google Docs API.
   */
  suggestionsViewMode?: string;

  /**
   * Partial response field selector.
   */
  fields?: string;

}

/**
 * Retrieves a Google document.
 *
 * Uses {@link DocsClient} to obtain an authenticated Google Docs client and
 * delegates to the Docs API v1 `documents.get` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Document identifier and optional retrieval controls.
 * @returns The Google document metadata and content.
 * @throws {Error} When `documentId` is empty or blank.
 */
export async function getDocument(
  options: GetDocumentOptions,
): Promise<docs_v1.Schema$Document> {

  const documentId = assertDocumentId(options.documentId, "getDocument");

  const docs = await new DocsClient().create();

  const params: docs_v1.Params$Resource$Documents$Get = {

    documentId,

  };

  if (options.includeTabsContent !== undefined) {

    params.includeTabsContent = options.includeTabsContent;

  }

  if (options.suggestionsViewMode !== undefined) {

    params.suggestionsViewMode = assertNonEmptyString(
      options.suggestionsViewMode,
      "suggestionsViewMode",
      "getDocument",
    );

  }

  if (options.fields !== undefined) {

    params.fields = assertNonEmptyString(options.fields, "fields", "getDocument");

  }

  const response = await docs.documents.get(params);

  return response.data;

}
