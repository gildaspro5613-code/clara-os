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

import { google } from "googleapis";

import { GoogleIntegration } from "./auth";

/**
 * Google Docs integration.
 */
export class GoogleDocsIntegration {

  /**
   * Google Docs API.
   */
  private readonly docs;

  /**
   * Constructor.
   */
  constructor() {

    const auth = GoogleIntegration.createClient();

    this.docs = google.docs({

      version: "v1",

      auth,

    });

  }

  /**
   * Creates a document.
   */
  public async createDocument(
    title: string,
  ): Promise<string> {

    const response =
      await this.docs.documents.create({

        requestBody: {

          title,

        },

      });

    return response.data.documentId ?? "";

  }

  /**
   * Reads a document.
   */
  public async getDocument(
    documentId: string,
  ) {

    return this.docs.documents.get({

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

    await this.docs.documents.batchUpdate({

      documentId,

      requestBody: {

        requests: [

          {

            insertText: {

              location: {

                index: 1,

              },

              text,

            },

          },

        ],

      },

    });

  }

  /**
   * Deletes a document.
   */
  public async deleteDocument(): Promise<void> {

    /**
     * Google Docs API
     * does not support deleting
     * documents directly.
     *
     * Deletion must be done
     * through Google Drive.
     */

    throw new Error(

      "Use Google Drive to delete a document.",

    );

  }

}