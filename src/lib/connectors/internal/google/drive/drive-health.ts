/**
 * ============================================
 * CLARA OS
 * Google Drive Health
 * --------------------------------------------
 * File : drive-health.ts
 * Responsibility :
 * Verifies Google Drive
 * connectivity.
 * ============================================
 */

import type { drive_v3 } from "googleapis";

/**
 * Google Drive health service.
 */
export class DriveHealth {

  /**
   * Creates a health service.
   */
  constructor(
    private readonly drive: drive_v3.Drive,
  ) {}

  /**
   * Checks Drive connectivity.
   */
  public async check(): Promise<void> {

    await this.drive.about.get({

      fields: "user,storageQuota",
    });

  }

}
