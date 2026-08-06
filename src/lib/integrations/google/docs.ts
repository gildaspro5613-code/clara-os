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

import type { docs_v1 } from "googleapis";

import {
  createDocument as createGoogleDocument,
  getDocument as getGoogleDocument,
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
  ): Promise<docs_v1.Schema$Document> {

    return getGoogleDocument({ documentId });

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
