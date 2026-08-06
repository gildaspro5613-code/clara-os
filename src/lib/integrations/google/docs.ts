/**
 * ============================================
 * CLARA OS
 * Google Docs Integration
 * --------------------------------------------
 * File : docs.ts
 * Responsibility :
 * Provides access to the
 * Google Docs API.
 * ============================================
 */

import {
  createDocument as createGoogleDocument,
  DocsClient,
  insertText as insertDocumentText,
} from "@/lib/connectors/google/docs";

/**
 * Google Docs integration.
 */
export class GoogleDocsIntegration {

  /**
   * Creates a document.
   */
  public async createDocument(
    title: string,
  ): Promise<string> {

    const document = await createGoogleDocument({ title });

    return document.documentId;

  }

  /**
   * Reads a document.
   */
  public async getDocument(
    documentId: string,
  ) {

    const docs = new DocsClient().create();

    return docs.documents.get({

      documentId,

    });

  }

  /**
   * Inserts text.
   */
  public async insertText(
    documentId: string,
    text: string,
  ): Promise<void> {

    await insertDocumentText({

      documentId,

      text,

    });

  }

  /**
   * Deletes a document.
   */
  public async deleteDocument(): Promise<void> {

    throw new Error(

      "Use Google Drive to delete a document.",

    );

  }

}
