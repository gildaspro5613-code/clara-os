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
  insertTable as insertDocumentTable,
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
  ): Promise<{
    documentId: string;
    documentUrl: string;
  }> {

    const document = await createGoogleDocument({ title });

    return {
      documentId: document.documentId,
      documentUrl: document.documentUrl,
    };

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
   * Inserts a table.
   */
  public async insertTable(
    documentId: string,
    rows: number,
    columns: number,
  ): Promise<void> {

    await insertDocumentTable({

      documentId,

      rows,

      columns,

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
