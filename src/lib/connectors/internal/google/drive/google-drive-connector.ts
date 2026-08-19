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
import {
  DriveFileListOptions,
  DriveFileListResult,
} from "./drive-files";

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
   * Lists files stored in Google Drive.
   */
  list(
    options?: DriveFileListOptions,
  ): Promise<DriveFileListResult>;

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