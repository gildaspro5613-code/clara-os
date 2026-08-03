/**
 * ============================================
 * CLARA OS
 * Google Sheets Connector
 * --------------------------------------------
 * File : google-sheets-connector.ts
 * Responsibility :
 * Defines the Google Sheets
 * connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import { GoogleSheetsContext } from "./google-sheets-context";
import { GoogleSheetsResult } from "./google-sheets-result";

/**
 * Google Sheets connector.
 */
export interface GoogleSheetsConnector extends Connector {

  /**
   * Connects to Google Sheets.
   */
  connect(): Promise<void>;

  /**
   * Reads data.
   */
  read(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult>;

  /**
   * Writes data.
   */
  write(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult>;

  /**
   * Updates data.
   */
  update(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult>;

  /**
   * Deletes data.
   */
  delete(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult>;

}