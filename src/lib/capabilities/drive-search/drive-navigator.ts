/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : drive-navigator.ts
 * Responsibility :
 * Lists the contents of a Drive folder.
 * ============================================
 */

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";
import type { DriveResourceEntry } from "@/lib/connectors/internal/google/drive/google-drive-result";

/**
 * Lists folder contents via GoogleDriveEngine.
 */
export class DriveNavigator {

  private _engine: GoogleDriveEngine | undefined;

  constructor(
    private readonly engineFactory?: () => GoogleDriveEngine,
  ) {}

  private getEngine(): GoogleDriveEngine {
    if (!this._engine) {
      this._engine = this.engineFactory
        ? this.engineFactory()
        : new GoogleDriveEngine();
    }
    return this._engine;
  }

  /**
   * Returns the direct children of a Drive folder.
   *
   * @param folderId - The Drive folder identifier.
   * @param folderName - Display name (used for logging / result metadata).
   * @returns Array of resources inside the folder.
   */
  public async browse(
    folderId: string,
    folderName = "",
  ): Promise<DriveResourceEntry[]> {

    const result = await this.getEngine().list({
      fileName: folderName,
      folderId,
    });

    return result.entries ?? [];

  }

}
