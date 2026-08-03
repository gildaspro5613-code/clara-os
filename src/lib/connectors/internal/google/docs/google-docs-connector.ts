/**
 * ============================================
 * CLARA OS
 * Google Docs Connector
 * --------------------------------------------
 * File : google-docs-connector.ts
 * Responsibility :
 * Defines the Google Docs
 * connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import { GoogleDocsContext } from "./google-docs-context";
import { GoogleDocsResult } from "./google-docs-result";

/**
 * Google Docs connector.
 */
export interface GoogleDocsConnector extends Connector {

  /**
   * Connects to Google Docs.
   */
  connect(): Promise<void>;

  /**
   * Creates a document.
   */
  create(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult>;

  /**
   * Reads a document.
   */
  read(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult>;

  /**
   * Updates a document.
   */
  update(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult>;

  /**
   * Exports a document.
   */
  export(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult>;

  /**
   * Deletes a document.
   */
  delete(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult>;

}