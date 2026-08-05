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
    permissions: string[],
  ): Promise<void> {

    for (const email of permissions) {

      const normalizedEmail =
        email.trim();

      if (!normalizedEmail) {

        continue;

      }

      await this.drive.permissions.create({

        fileId,

        supportsAllDrives: true,

        sendNotificationEmail: false,

        requestBody: {

          type: "user",

          role: "writer",

          emailAddress:
            normalizedEmail,

        },

      });

    }

  }

}
