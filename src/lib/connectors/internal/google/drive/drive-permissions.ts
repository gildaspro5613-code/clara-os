/**
 * ============================================
 * CLARA OS
 * Google Drive Permissions
 * --------------------------------------------
 * File : drive-permissions.ts
 * Responsibility :
 * Applies Google Drive
 * sharing permissions.
 * ============================================
 */

import type { drive_v3 } from "googleapis";

import type { GoogleDrivePermissionInput } from "./google-drive-context";

/**
 * Google Drive permissions service.
 */
export class DrivePermissions {

  /**
   * Creates a permission service.
   */
  constructor(
    private readonly drive: drive_v3.Drive,
  ) {}

  /**
   * Shares a file with users.
   */
  public async share(
    fileId: string,
    permissions: GoogleDrivePermissionInput[],
  ): Promise<void> {

    for (const permission of permissions) {

      const normalizedEmail =
        permission.email.trim();

      if (!normalizedEmail) {

        continue;

      }

      await this.drive.permissions.create({

        fileId,

        supportsAllDrives: true,

        sendNotificationEmail: false,

        requestBody: {

          type: "user",

          role:
            permission.role ?? "writer",

          emailAddress:
            normalizedEmail,

        },

      });

    }

  }

}
