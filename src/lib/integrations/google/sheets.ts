/**
 * ============================================
 * CLARA OS
 * Google Sheets Integration
 * --------------------------------------------
 * File : sheets.ts
 * Responsibility :
 * Provides access to the
 * Google Sheets API.
 * ============================================
 */

import { google } from "googleapis";

import { GoogleIntegration } from "./auth";

/**
 * Google Sheets integration.
 */
export class GoogleSheetsIntegration {

  /**
   * Google Sheets API.
   */
  private readonly sheets;

  /**
   * Constructor.
   */
  constructor() {

    const auth = GoogleIntegration.createClient();

    this.sheets = google.sheets({

      version: "v4",

      auth,

    });

  }

  /**
   * Creates one spreadsheet.
   */
  public async createSpreadsheet(
    title: string,
  ): Promise<string> {

    const response =
      await this.sheets.spreadsheets.create({

        requestBody: {

          properties: {

            title,

          },

        },

      });

    return response.data.spreadsheetId ?? "";

  }

  /**
   * Reads one spreadsheet.
   */
  public async getSpreadsheet(
    spreadsheetId: string,
  ) {

    return this.sheets.spreadsheets.get({

      spreadsheetId,

    });

  }

}