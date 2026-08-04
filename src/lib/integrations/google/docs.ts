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
   * Creates a Google document.
   */
  public async create(
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

}