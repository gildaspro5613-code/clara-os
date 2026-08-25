/**
 * ============================================
 * CLARA OS
 * Google Drive Connector
 * --------------------------------------------
 * File : google-drive-connector.ts
 * Responsibility :
 * Defines the Google Drive
 * connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import { GoogleDriveContext } from "./google-drive-context";
import { GoogleDriveResult } from "./google-drive-result";

/**
 * Google Drive connector.
 */
export interface GoogleDriveConnector extends Connector {

  /**
   * Connects to Google Drive.
   */
  connect(): Promise<void>;

  /**
   * Searches for resources matching a free-text query.
   */
  search(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Lists the contents of a folder.
   */
  list(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Reads the plain-text content of a document.
   */
  readContent(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Uploads a file.
   */
  upload(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Downloads a file.
   */
  download(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Moves a file to another folder.
   */
  move(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Creates a folder.
   */
  createFolder(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Shares a file.
   */
  share(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

  /**
   * Deletes a file.
   */
  delete(
    context: GoogleDriveContext,
  ): Promise<GoogleDriveResult>;

}