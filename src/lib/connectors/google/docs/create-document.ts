/**
 * ============================================
 * CLARA OS
 * Google Docs – Create Document
 * --------------------------------------------
 * File : create-document.ts
 * Responsibility :
 * Creates a new Google document
 * using DocsClient.
 * ============================================
 */

import { assertNonEmptyString, buildDocumentUrl, DocsClient } from "./docs-client";

/**
 * Options for creating a Google document.
 */
export interface CreateDocumentOptions {

  /**
   * Document title.
   */
  title: string;

}

/**
 * Created Google document summary.
 */
export interface CreateDocumentResult {

  /**
   * Unique document identifier.
   */
  documentId: string;

  /**
   * Document title.
   */
  title: string;

  /**
   * Canonical URL used to open the document.
   */
  documentUrl: string;

  /**
   * Google Docs revision identifier.
   */
  revisionId?: string;

}

/**
 * Creates a Google document.
 *
 * Uses {@link DocsClient} to obtain an authenticated Google Docs client and
 * delegates creation to the Docs API v1 `documents.create` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Document creation options.
 * @returns The created document summary.
 * @throws {Error} When `title` is empty or blank.
 */
export async function createDocument(
  options: CreateDocumentOptions,
): Promise<CreateDocumentResult> {

  const title = assertNonEmptyString(options.title, "title", "createDocument");

  const docs = new DocsClient().create();

  const response = await docs.documents.create({

    requestBody: {

      title,

    },

  });

  if (typeof response.data.documentId !== "string") {

    throw new Error("createDocument: Google API did not return a documentId.");

  }

  return {

    documentId: response.data.documentId,

    title: response.data.title ?? title,

    documentUrl: buildDocumentUrl(response.data.documentId),

    revisionId: response.data.revisionId ?? undefined,

  };

}
