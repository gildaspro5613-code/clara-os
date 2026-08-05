/**
 * ============================================
 * CLARA OS
 * Google Drive Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Google Drive
 * connector module.
 * ============================================
 */

import { DriveClient } from "./drive-client";
import { DriveFiles } from "./drive-files";
import { DriveFolders } from "./drive-folders";
import { DriveHealth } from "./drive-health";
import { DrivePermissions } from "./drive-permissions";
import { GoogleDriveEngine } from "./google-drive-engine";

const googleDriveClient =
  new DriveClient().create();

/**
 * Google Drive connector module.
 */
export const GOOGLE_DRIVE_MODULE = {

  id: "google-drive",

  name: "Google Drive",

  version: "1.0.0",

  description:
    "Provides access to Google Drive through Clara OS.",

  client: new DriveClient(),

  folders:
    new DriveFolders(
      googleDriveClient,
    ),

  files: new DriveFiles(
    googleDriveClient,
  ),

  permissions:
    new DrivePermissions(
      googleDriveClient,
    ),

  health: new DriveHealth(
    googleDriveClient,
  ),

  engine: new GoogleDriveEngine(),

} as const;
